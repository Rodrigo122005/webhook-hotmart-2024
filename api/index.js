export default function handler(req, res) {
  res.status(200).json({ 
    status: "🎉 FUNCIONANDO COM VARIÁVEIS!",
    variaveis: {
      ghl_api_key: process.env.GHL_API_KEY ? "✅ EXISTE!" : "❌ NÃO EXISTE",
      ghl_location: process.env.GHL_LOCATION_ID ? "✅ EXISTE!" : "❌ NÃO EXISTE"
    },
    primeiros_chars: {
      api_key: process.env.GHL_API_KEY?.substring(0, 10) + "...",
      location: process.env.GHL_LOCATION_ID?.substring(0, 8) + "..."
    },
    timestamp: new Date()
  });
}
