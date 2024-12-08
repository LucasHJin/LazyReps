import React, { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import '../src/styles/App.css';
import calculateAngle from './services/calcAngle'
import drawPoseOnCanvas from './services/drawPose'
import stopTracking from './services/track';


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
          drawPoseOnCanvas(response.data.pose, canvasRef); 
  
          if (!isRepAnalyzed) {
            [lastAngleTest, tempRepCount] = analyzeRep(response.data.pose, lastAngleTest, tempRepCount);
            setIsRepAnalyzed(true);
          }
        } catch (error) {
          console.error("Error sending frame to backend:", error.response?.data || error.message);
        }
      }
    }, 100);
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
            stopTracking(repCount);
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