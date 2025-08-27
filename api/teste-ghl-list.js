export default async function handler(req, res) {
  try {
    const axios = require('axios');
    
    // TESTAR LISTAGEM DE CONTATOS (mais simples)
    const response = await axios.get(
      `https://services.leadconnectorhq.com/contacts/?locationId=${process.env.GHL_LOCATION_ID}&limit=1`,
      {
        headers: {
          'Authorization': `Bearer ${process.env.GHL_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );

    return res.status(200).json({
      sucesso: true,
      mensagem: 'Conexão com GHL funcionando!',
      total_contatos: response.data?.meta?.total || 0
    });

  } catch (error) {
    return res.status(500).json({
      erro: true,
      status: error.response?.status,
      mensagem: error.response?.data || error.message
    });
  }
}
