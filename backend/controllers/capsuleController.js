const db = require('../models/Capsule');
const { encrypt, decrypt } = require('../utils/crypto');
const axios = require('axios');
const nodemailer = require('nodemailer');
const crypto = require("../utils/crypto");
const { getPRCount } = require('../services/githubService');
const sendEmail = require('../utils/sendEmail');
const dbUser = require('../models/User');

exports.createCapsule = (req, res) => {
  const { title, message, triggerType, triggerValue } = req.body;
  const userEmail = req.user.email || req.user.username || "user@example.com";
  const encryptedMsg = encrypt(message);

  const query = `
    INSERT INTO capsules (userId, title, message, triggerType, triggerValue, userEmail, createdAt)
    VALUES (?, ?, ?, ?, ?, ?, datetime('now'))
  `;
  db.run(query, [req.user.id, title, encryptedMsg, triggerType, triggerValue, userEmail], function (err) {
    if (err) return res.status(400).json({ error: err.message });
    res.json({ id: this.lastID, title });
  });
};

exports.getMyCapsules = (req, res) => {
  console.log("Fetching capsules for user:", req.user.id); 
  db.all(`SELECT * FROM capsules WHERE userId = ?`, [req.user.id], async (err, rows) => {
    if (err) {
      console.error("Database error:", err);
      return res.status(500).json({ error: err.message });
    }

    const now = new Date();
    const updatePromises = rows.map(row => {
      if (
        row.triggerType === "date" &&
        new Date(row.triggerValue).getTime() <= now.getTime() &&
        !row.isDelivered
      ) {
        return new Promise((resolve) => {
          db.run(
            `UPDATE capsules SET isDelivered = 1, openedAt = datetime('now') WHERE id = ?`,
            [row.id],
            () => {
              row.isDelivered = 1;
              row.openedAt = now.toISOString();
              resolve();
            }
          );
        });
      }
      return Promise.resolve();
    });

    await Promise.all(updatePromises);

    db.all(`SELECT * FROM capsules WHERE userId = ?`, [req.user.id], (err2, updatedRows) => {
      if (err2) {
        return res.status(500).json({ error: err2.message });
      }
      const decrypted = updatedRows.map(row => {
        if (row.isDelivered) {
          if (!row.openedAt) {
            db.run(`UPDATE capsules SET openedAt = datetime('now') WHERE id = ?`, [row.id]);
          }
          
          try {
            row.message = decrypt(row.message);
          } catch (e) {
            row.message = "[Error decrypting message]";
          }
          return row;
        } else {
          return { ...row, message: "🔒 Locked until trigger is met." };
        }
      });
      res.json(decrypted);
    });
  });
};

exports.getCapsules = (req, res) => {
  const userId = req.user.id;
  const now = new Date().toISOString();

  db.all(
    `SELECT * FROM capsules WHERE userId = ?`,
    [userId],
    (err, capsules) => {
      if (err) {
        console.error("Error fetching capsules:", err);
        return res.status(500).json({ error: "Failed to fetch capsules." });
      }

      const updatedCapsules = capsules.map((capsule) => {
        const now = new Date();

        if (
          capsule.triggerType === "date" &&
          new Date(capsule.triggerValue).getTime() <= now.getTime() &&
          !capsule.isDelivered
        ) {
          db.run(
            `UPDATE capsules SET isDelivered = 1, openedAt = datetime('now') WHERE id = ?`,
            [capsule.id]
          );
          capsule.isDelivered = 1;
          capsule.openedAt = now.toISOString();
        }

        if (capsule.message) {
          const [iv, encrypted] = capsule.message.split(":");
          capsule.message = crypto.decrypt(encrypted, iv);
        }

        return capsule;
      });

      res.json(updatedCapsules);
    }
  );
};

exports.simulateTriggers = async (req, res) => {
  db.all(`SELECT * FROM capsules WHERE isDelivered = 0`, [], async (err, capsules) => {
    if (err) return res.status(500).json({ error: err.message });

    const now = new Date();
    let deliveredCount = 0;

    for (const capsule of capsules) {
      let shouldDeliver = false;

      if (capsule.triggerType === "date") {
        const triggerDate = new Date(capsule.triggerValue);
        if (now >= triggerDate) shouldDeliver = true;
      }

      if (capsule.triggerType === "location" && capsule.triggerValue.toLowerCase() === "paris") {
        shouldDeliver = true; 
      }

      if (capsule.triggerType === "milestone") {
       
        await new Promise((resolve) => {
          db.get('SELECT githubToken FROM users WHERE id = ?', [capsule.userId], async (userErr, user) => {
            if (userErr || !user || !user.githubToken) {
              console.warn(`No GitHub token for user ${capsule.userId}, skipping capsule ${capsule.id}`);
              resolve();
              return;
            }
            try {
              const currentPRs = await getPRCount(user.githubToken);
              const target = parseInt(capsule.triggerValue);
              if (currentPRs >= target) shouldDeliver = true;
            } catch (apiErr) {
              console.error(`GitHub API error for capsule ${capsule.id}:`, apiErr.message);
            }
            resolve();
          });
        });
      }

      if (shouldDeliver) {
        db.run(
          'UPDATE capsules SET isDelivered = 1, openedAt = datetime(\'now\') WHERE id = ?',
          [capsule.id]
        );
        deliveredCount++;
        if (capsule.triggerType === "milestone") {
          sendCongratulatoryEmail(capsule.userId);
        }
        db.run('DELETE FROM capsules WHERE id = ?', [capsule.id], (deleteErr) => {
          if (deleteErr) {
            console.error("Error deleting capsule:", deleteErr);
          } else {
            console.log(`Capsule with ID ${capsule.id} deleted successfully.`);
          }
        });
      }
    }
    res.json({ deliveredCount });
  });
};

exports.simulatePRMilestone = async (req, res) => {
  const { userId, targetPRCount } = req.body;
  db.all(`SELECT * FROM capsules WHERE userId = ? AND triggerType = 'milestone'`, [userId], async (err, capsules) => {
    if (err) return res.status(500).json({ error: err.message });
    let deliveredCount = 0;
    for (const capsule of capsules) {
      await new Promise((resolve) => {
        db.get('SELECT githubToken FROM users WHERE id = ?', [userId], async (userErr, user) => {
          if (userErr || !user || !user.githubToken) {
            console.warn(`No GitHub token for user ${userId}, skipping capsule ${capsule.id}`);
            resolve();
            return;
          }
          try {
            const currentPRs = await getPRCount(user.githubToken);
            if (parseInt(capsule.triggerValue) <= currentPRs) {
              db.run(
                'UPDATE capsules SET isDelivered = 1, openedAt = datetime(\'now\') WHERE id = ?',
                [capsule.id]
              );
              deliveredCount++;
              sendCongratulatoryEmail(userId);
            }
          } catch (apiErr) {
            console.error(`GitHub API error for capsule ${capsule.id}:`, apiErr.message);
          }
          resolve();
        });
      });
    }
    res.json({ deliveredCount });
  });
};

exports.checkInLocation = (req, res) => {
  const { userId, location } = req.body;
  if (!userId || !location) {
    return res.status(400).json({ error: 'userId and location are required.' });
  }
  const dbModel = require('../models/Capsule');
  dbModel.all(
    `SELECT * FROM capsules WHERE userId = ? AND triggerType = 'location' AND isDelivered = 0`,
    [userId],
    (err, rows) => {
      if (err) {
        return res.status(500).json({ error: err.message });
      }
      let deliveredCount = 0;
      let emailPromises = [];
      rows.forEach((capsule) => {
        if (capsule.triggerValue && capsule.triggerValue.toLowerCase() === location.toLowerCase()) {
          dbModel.run(
            `UPDATE capsules SET isDelivered = 1, openedAt = datetime('now') WHERE id = ?`,
            [capsule.id],
            (err) => {
              if (err) {
                console.error(err.message);
              } else {
                deliveredCount++;
                emailPromises.push(new Promise((resolve) => {
                  dbUser.get('SELECT email FROM users WHERE id = ?', [userId], async (userErr, user) => {
                    const to = (user && user.email) || capsule.userEmail;
                    if (to) {
                      try {
                        await sendEmail({
                          to,
                          subject: `🎉 Your Time Capsule is Unlocked at ${location}!`,
                          text: `Hi! You have just unlocked your time capsule "${capsule.title}" by arriving at ${location}. Visit the app to view your message!`,
                        });
                        console.log(`Location delivery email sent for capsule ID: ${capsule.id}`);
                      } catch (emailErr) {
                        console.error(`Error sending location delivery email for capsule ID: ${capsule.id}`, emailErr);
                      }
                    }
                    resolve();
                  });
                }));
              }
            }
          );
        }
      });
      Promise.all(emailPromises).then(() => {
        res.json({ delivered: deliveredCount > 0, count: deliveredCount, message: deliveredCount > 0 ? `Delivered ${deliveredCount} capsule(s) at ${location}.` : 'No capsules to deliver at this location.' });
      });
    }
  );
};
