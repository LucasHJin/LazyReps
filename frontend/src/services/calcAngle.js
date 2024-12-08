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

export default calculateAngle;
