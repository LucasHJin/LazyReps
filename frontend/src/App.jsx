import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import '../src/styles/App.css';


const App = () => {
  const [poseData, setPoseData] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [isStreaming, setIsStreaming] = useState(false);
  const [repCount, setRepCount] = useState(0);
  const [currentAngle, setCurrentAngle] = useState(0);
  const [isRepAnalyzed, setIsRepAnalyzed] = useState(false);
  const intervalRef = useRef(null);  

  useEffect(() => {
    if (isStreaming) {
      const startVideo = async () => {
        try {
          const stream = await navigator.mediaDevices.getUserMedia({ video: true });
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          console.log('Webcam streaming started'); 

          videoRef.current.addEventListener('canplaythrough', () => {
            console.log('Video is ready to play!');
            captureFrame(); 
          });
        } catch (error) {
          console.error("Error accessing webcam:", error);
        }
      };
      
      startVideo();
    } else {
      if (videoRef.current && videoRef.current.srcObject) {
        const stream = videoRef.current.srcObject;
        const tracks = stream.getTracks();
        tracks.forEach(track => track.stop());
      }
    }
  }, [isStreaming]);

  const captureFrame = async () => {
    let lastAngleTest = 0;
    let tempRepCount = 0;

    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(async () => {
      if (videoRef.current && videoRef.current.readyState >= 3) {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
  
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
      
        const imageData = canvas.toDataURL('image/jpeg');
          
        try {
          const response = await axios.post('http://127.0.0.1:8000/analyze_pose/', {
            image: imageData,
          });
          
          setPoseData(response.data.pose);
          drawPoseOnCanvas(response.data.pose); 
  
          if (!isRepAnalyzed) {
            [lastAngleTest, tempRepCount] = analyzeRep(response.data.pose, lastAngleTest, tempRepCount);
            console.log("AAAA", lastAngleTest, tempRepCount)
            setIsRepAnalyzed(true);
          }
        } catch (error) {
          console.error("Error sending frame to backend:", error.response?.data || error.message);
        }
      }
    }, 100);
  };

  const drawPoseOnCanvas = (pose) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (!pose || pose.length === 0) {
      console.error("Pose data is empty or invalid");
      return;
    }
  
    const keypointColor = 'red';
    const keypointRadius = 5;

    pose[0].forEach((keypoints) => {
        keypoints.forEach((keypoint, index) => {
        if (index == 6 || index == 8 || index == 10) {
          const y = keypoint[0]; 
          const x = keypoint[1]; 
          const confidence = keypoint[2]; 

          ctx.beginPath();
          ctx.arc(x * canvas.width, y * canvas.height, keypointRadius, 0, 2 * Math.PI);
          ctx.fillStyle = keypointColor;
          ctx.fill();
        }
      });
    });
  
    const connections = [
      [0, 1], [0, 2], [1, 3], [2, 4], [0, 5], [0, 6], 
      [5, 7], [7, 9], [6, 8], [8, 10], [5, 11], [6, 12],
      [11, 12], [11, 13], [13, 15], [12, 14], [14, 16]
    ];
  
    connections.forEach(([start, end]) => {
      const startKeypoint = pose[start];
      const endKeypoint = pose[end];
      if (startKeypoint && endKeypoint) {
        const [startY, startX] = startKeypoint;
        const [endY, endX] = endKeypoint;
        ctx.beginPath();
        ctx.moveTo(startX * canvas.width, startY * canvas.height);
        ctx.lineTo(endX * canvas.width, endY * canvas.height);
        ctx.strokeStyle = 'blue';
        ctx.lineWidth = 2;
        ctx.stroke();
      }
    });
  };

  const calculateDistance = (point1, point2) => {
    const [x1, y1] = point1;
    const [x2, y2] = point2;
    return Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
  };
  
  const calculateAngle = (point1, point2, point3) => {
    if (!Array.isArray(point1) || point1.length !== 2) {
      console.error("Invalid point1:", point1);
      return 0; 
    }
    if (!Array.isArray(point2) || point2.length !== 2) {
      console.error("Invalid point2:", point2);
      return 0; 
    }
    if (!Array.isArray(point3) || point3.length !== 2) {
      console.error("Invalid point3:", point3);
      return 0; 
    }
    
    const [x1, y1] = point1;
    const [x2, y2] = point2;
    const [x3, y3] = point3;
  
    const vector1 = [x1 - x2, y1 - y2]; 
    const vector2 = [x3 - x2, y3 - y2]; 
  
    const dotProduct = vector1[0] * vector2[0] + vector1[1] * vector2[1];
    const magnitude1 = calculateDistance(point1, point2);
    const magnitude2 = calculateDistance(point3, point2);
  
    const cosAngle = dotProduct / (magnitude1 * magnitude2);
  
    return Math.acos(cosAngle) * (180 / Math.PI);
  };
  
  const detectRep = (shoulder, elbow, wrist, lastAngle) => {
    const angle = calculateAngle(shoulder, elbow, wrist);
  
    const maxAngle = 155; 
    const minAngle = 50; 
  
    if (lastAngle > maxAngle && angle < minAngle) {
      console.log("Start of Rep");
    } else if (lastAngle < minAngle && angle > maxAngle) {
      console.log("End of Rep");
    }
  
    return angle;
  };

  const analyzeRep = (pose, lastAngleTest, tempRepCount) => {
    const leftShoulder = pose[0][0][6];
    const leftElbow = pose[0][0][8];
    const leftWrist = pose[0][0][10];
  
    if (!leftShoulder || !leftElbow || !leftWrist) {
      console.error("One or more keypoints are missing");
      return; 
    }
  
    const shoulderCoord = leftShoulder ? [leftShoulder[0], leftShoulder[1]] : [0, 0];
    const elbowCoord = leftElbow ? [leftElbow[0], leftElbow[1]] : [0, 0];
    const wristCoord = leftWrist ? [leftWrist[0], leftWrist[1]] : [0, 0];
  
    const angle = detectRep(shoulderCoord, elbowCoord, wristCoord, lastAngleTest);
  
    if (angle < 50 && lastAngleTest > 155 || angle > 155 && lastAngleTest < 50) {
      tempRepCount += 0.5;
      console.log(tempRepCount, repCount, angle, lastAngleTest);
      if (tempRepCount === Math.floor(tempRepCount)) {
        setRepCount((prevRepCount) => prevRepCount + 1);
        console.log(repCount);
      }
      console.log(`Rep completed. Total reps: ${repCount + 1}`);
      lastAngleTest = angle
      console.log(lastAngleTest)
    }
    setCurrentAngle(angle);

    return [lastAngleTest, tempRepCount]
  };

  const stopTracking = async () => {
    try {
      await axios.post('http://127.0.0.1:8000/write_to_sheet/', {
        rep_count: repCount
      });
      console.log("Rep count sent to backend");
    } catch (error) {
      console.error("Error sending rep count to backend:", error);
    }
  };

  return (
    <div>
      <h1>Lazy Reps</h1>

      <button 
        onClick={() => {
          setIsStreaming(!isStreaming);
          if (!isStreaming) {
            setRepCount(0);  
            setIsRepAnalyzed(false);  
          } else {
            stopTracking();
          }
        }} 
        style={{
          zIndex: 10,
          backgroundColor: isStreaming ? '#a01210' : '#774822', 
          color: 'white',
          fontSize: '18px',
          padding: '10px 20px',
          border: 'none',
          borderRadius: '5px',
          cursor: 'pointer',
          transition: 'background-color 0.3s', 
        }}
      >
        {isStreaming ? 'Stop Tracking' : 'Start Tracking'}
      </button>


      <video ref={videoRef} style={{ width: '851px', height: '638px', background: 'black' }} autoPlay />

      { /* 
      <canvas
        ref={canvasRef}
        style={{ position: 'absolute', top: 0, left: 0, pointerEvents: 'none' }}
      />
      */}

      <canvas
        ref={canvasRef}
        style={{ display: 'none' }}
      />

      <div className='stats'>
        <h3>Reps Completed: {repCount}</h3>
        <h3>Current Elbow Angle: {currentAngle.toFixed(2)}°</h3> 
      </div>

    </div>
  );
};

export default App;
