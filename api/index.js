export default function handler(req, res) {
  res.status(200).json({ 
    status: "FUNCIONANDO!",
    method: req.method,
    timestamp: new Date(),
    env_test: {
      node_env: process.env.NODE_ENV,
      vercel_env: process.env.VERCEL_ENV || "undefined"
    }
  });
}
