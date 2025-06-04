// Mock function to simulate GitHub PR count
function getUserPRCount(userId) {

    const mockPRCounts = {
      1: 50,
      2: 120,
      3: 80,
    };
    return mockPRCounts[userId] || 0;
  }
  
  module.exports = { getUserPRCount };
  