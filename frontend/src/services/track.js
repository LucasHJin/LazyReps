import axios from 'axios';

const stopTracking = async (repCount) => {
    try {
      await axios.post('http://127.0.0.1:8000/write_to_sheet/', {
        rep_count: repCount
      });
      console.log("Rep count sent to backend");
    } catch (error) {
      console.error("Error sending rep count to backend:", error);
    }
  };

  export default stopTracking;