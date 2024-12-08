const drawPoseOnCanvas = (pose, canvasRef) => {
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

export default drawPoseOnCanvas;