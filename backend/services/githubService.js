const axios = require('axios');

exports.getPRCount = async (accessToken) => {
  try {
   const reposRes = await axios.get('https://api.github.com/user/repos', {
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const repos = reposRes.data;
    let totalPRs = 0;

   for (const repo of repos) {
      const pullsRes = await axios.get(`https://api.github.com/repos/${repo.owner.login}/${repo.name}/pulls`, {
        headers: {
          Authorization: `Bearer ${accessToken}`
        }
      });

     totalPRs += pullsRes.data.filter(pr => pr.user.login === repo.owner.login).length;
    }

    return totalPRs;
  } catch (err) {
    console.error('Error fetching PR data from GitHub:', err.response?.data || err.message);
    throw err;
  }
};
