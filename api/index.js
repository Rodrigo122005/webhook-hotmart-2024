export default function handler(req, res) {
  res.status(200).json({ 
    status: "FUNCIONANDO PERFEITAMENTE!", // ← Mudou aqui
    method: req.method,
    timestamp: new Date()
  });
}
