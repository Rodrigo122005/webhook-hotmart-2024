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

    // Usar fetch em vez de axios
    const response = await fetch('https://services.leadconnectorhq.com/contacts/', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GHL_API_KEY}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(dadosContato)
    });

    const responseText = await response.text();
    console.log('📥 Response status:', response.status);
    console.log('📥 Response text:', responseText);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${responseText}`);
    }

    const data = JSON.parse(responseText);
    console.log('✅ Sucesso GHL:', data);

    return res.status(200).json({
      sucesso: true,
      mensagem: 'Contato criado no GoHighLevel!',
      dados: data,
      contato_id: data?.contact?.id
    });

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
