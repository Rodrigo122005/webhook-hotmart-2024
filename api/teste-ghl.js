export default async function handler(req, res) {
  try {
    const axios = require('axios');
    
    console.log('🧪 Testando conexão com GoHighLevel...');
    
    // Dados do contato
    const dadosContato = {
      locationId: process.env.GHL_LOCATION_ID,
      firstName: "Teste",
      lastName: "Webhook", 
      email: "teste@webhook.com",
      phone: "+5511999999999",
      tags: ["teste-webhook"]
    };

    console.log('📤 Enviando para GHL:', dadosContato);

    // HEADERS CORRETOS PARA GHL
    const response = await axios.post(
      'https://services.leadconnectorhq.com/contacts/',
      dadosContato,
      {
        headers: {
          'Authorization': `Bearer ${process.env.GHL_API_KEY}`,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
          // REMOVEMOS a versão que estava causando problema
        },
        timeout: 15000
      }
    );

    console.log('✅ Sucesso GHL:', response.data);

    return res.status(200).json({
      sucesso: true,
      mensagem: 'Contato criado no GoHighLevel!',
      dados: response.data
    });

  } catch (error) {
    console.error('❌ Erro:', error.response?.data || error.message);
    
    return res.status(500).json({
      erro: true,
      mensagem: error.message,
      status: error.response?.status,
      ghl_response: error.response?.data,
      headers_enviados: {
        authorization: `Bearer ${process.env.GHL_API_KEY?.substring(0, 20)}...`,
        content_type: 'application/json'
      }
    });
  }
}
