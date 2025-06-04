
import axios from "axios";

export const fetchAnalytics = async () => {
  try {
    const response = await axios.get("http://localhost:5000/api/analytics");  
    console.log("Fetched Analytics Data:", response.data);
    
  
    if (
      response.data &&
      Array.isArray(response.data.created) &&
      Array.isArray(response.data.opened) &&
      Array.isArray(response.data.reminders)
    ) {
      return response.data;
    } else {
      throw new Error("Invalid data structure received from the API");
    }
  } catch (error) {
    // Log detailed error info
    console.error("Error fetching analytics:", error.message);
    console.error(error.stack);
    
    
    return {
      created: [],
      opened: [],
      reminders: [],
    };
  }
};
