export default function handler(req, res) {
  // Só aceita POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Só aceito POST' });
  }

  try {
    console.log('🚀 Webhook recebido da Hotmart!');
    console.log('📦 Dados:', JSON.stringify(req.body, null, 2));
    
    const data = req.body;
    
    // Extrair dados importantes
    const comprador = {
      nome: data?.data?.buyer?.name || 'Cliente',
      email: data?.data?.buyer?.email,
      telefone: data?.data?.buyer?.checkout_phone,
      produto: data?.data?.product?.name,
      valor: data?.data?.purchase?.price?.value,
      evento: data?.event
    };

    console.log('👤 Comprador:', comprador);

    // Se for compra aprovada, criar no GoHighLevel
    if (data.event === 'PURCHASE_APPROVED' && comprador.email) {
      return criarNoGoHighLevel(comprador, res);
    }

    return res.status(200).json({ 
      sucesso: true,
      mensagem: `Evento ${data.event} recebido!`,
      comprador: comprador.email
    });

  } catch (error) {
    console.error('❌ Erro:', error);
    return res.status(500).json({ 
      erro: 'Erro interno', 
      detalhes: error.message 
    });
  }
}

async function criarNoGoHighLevel(comprador, res) {
  try {
    console.log('🎯 Criando no GoHighLevel...');
    
    const axios = require('axios');
    
    const dadosContato = {
      locationId: process.env.GHL_LOCATION_ID,
      firstName: comprador.nome.split(' ')[0],
      lastName: comprador.nome.split(' ').slice(1).join(' ') || 'Hotmart',
      email: comprador.email,
      phone: comprador.telefone,
      tags: ['hotmart', 'cliente-novo', comprador.produto?.toLowerCase()]
    };

    const response = await axios.post(
      'https://services.leadconnectorhq.com/contacts/',
      dadosContato,
      {
        headers: {
          'Authorization': `Bearer ${process.env.GHL_API_KEY}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json'
        }
      }
    );

    console.log('✅ Contato criado!', response.data?.contact?.id);

    return res.status(200).json({ 
      sucesso: true,
      mensagem: 'Contato criado no GoHighLevel!',
      contato_id: response.data?.contact?.id
    });

  } catch (error) {
    console.error('❌ Erro GHL:', error.response?.data || error.message);
    
    return res.status(200).json({ 
      sucesso: false,
      erro_ghl: error.response?.data || error.message,
      webhook_processado: true
    });
  }
}
