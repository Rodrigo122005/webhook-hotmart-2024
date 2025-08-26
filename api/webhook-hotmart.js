export default function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Só aceito POST' });
  }
  
  return res.status(200).json({ 
    message: 'Webhook funcionando!',
    timestamp: new Date()
  });
}
