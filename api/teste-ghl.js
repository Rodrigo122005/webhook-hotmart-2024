export default async function handler(req, res) {
  try {
    console.log('🧪 Testando conexão com GoHighLevel...');
    console.log('API Key exists:', !!process.env.GHL_API_KEY);
    console.log('Location ID:', process.env.GHL_LOCATION_ID);
    
    // Dados para teste
    const dadosContato = {
      locationId: process.env.GHL_LOCATION_ID,
      firstName: "Teste",
      lastName: "Webhook",
      email: "teste@webhook.com",
      phone: "+5511999999999",
      tags: ["teste-webhook"]
    };

    console.log('📤 Enviando para GHL:', dadosContato);

    // Usando fetch nativo
    const response = await fetch('https://services.leadconnectorhq.com/contacts/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GHL_API_KEY}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dadosContato)
    });

    const responseData = await response.json();
    
    console.log('📨 Status GHL:', response.status);
    console.log('📨 Resposta GHL:', responseData);

    if (response.ok) {
      return res.status(200).json({
        sucesso: true,
        mensagem: 'Contato criado no GoHighLevel!',
        dados: responseData,
        contato_id: responseData?.contact?.id
      });
    } else {
      throw new Error(`GHL retornou erro: ${response.status} - ${JSON.stringify(responseData)}`);
    }

  } catch (error) {
    console.error('❌ Erro completo:', error);
    
    return res.status(500).json({
      erro: true,
      mensagem: error.message,
      api_key_exists: !!process.env.GHL_API_KEY,
      location_id: process.env.GHL_LOCATION_ID?.substring(0, 8) + '...'
    });
  }
}
