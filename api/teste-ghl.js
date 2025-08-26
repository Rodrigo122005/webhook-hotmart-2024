export default async function handler(req, res) {
  try {
    const axios = require('axios');
    
    console.log('🧪 Testando conexão com GoHighLevel...');
    console.log('API Key exists:', !!process.env.GHL_API_KEY);
    console.log('Location ID:', process.env.GHL_LOCATION_ID);
    
    // Testar criação de contato simples
    const dadosContato = {
      locationId: process.env.GHL_LOCATION_ID,
      firstName: "Teste",
      lastName: "Webhook",
      email: "teste@webhook.com",
      phone: "+5511999999999",
      tags: ["teste-webhook"]
    };

    console.log('📤 Enviando para GHL:', dadosContato);

    const response = await axios.post(
      'https://services.leadconnectorhq.com/contacts/',
      dadosContato,
      {
        headers: {
          'Authorization': `Bearer ${process.env.GHL_API_KEY}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json'
        },
        timeout: 15000
      }
    );

    console.log('✅ Sucesso GHL:', response.data);

    return res.status(200).json({
      sucesso: true,
      mensagem: 'Contato criado no GoHighLevel!',
      dados: response.data,
      contato_id: response.data?.contact?.id
    });

  } catch (error) {
    console.error('❌ Erro completo:', error);
    console.error('❌ Response data:', error.response?.data);
    console.error('❌ Status:', error.response?.status);
    
    return res.status(500).json({
      erro: true,
      mensagem: error.message,
      status: error.response?.status,
      detalhes: error.response?.data,
      api_key_exists: !!process.env.GHL_API_KEY,
      location_id: process.env.GHL_LOCATION_ID?.substring(0, 8) + '...'
    });
  }
}
