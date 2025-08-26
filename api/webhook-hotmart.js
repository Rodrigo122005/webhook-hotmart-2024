const axios = require('axios');

export default async function handler(req, res) {
  // Só aceita POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido - só POST' });
  }

  try {
    console.log('🚀 Webhook recebido da Hotmart!');
    console.log('📦 Headers:', req.headers);
    console.log('📦 Body:', JSON.stringify(req.body, null, 2));
    
    // Extrair dados do webhook da Hotmart
    const data = req.body;
    
    const comprador = {
      nome: data?.data?.buyer?.name || 'Cliente Hotmart',
      email: data?.data?.buyer?.email,
      telefone: data?.data?.buyer?.checkout_phone,
      produto: data?.data?.product?.name,
      valor: data?.data?.purchase?.price?.value,
      moeda: data?.data?.purchase?.price?.currency_value,
      evento: data?.event,
      transacao: data?.data?.purchase?.transaction,
      status: data?.data?.purchase?.status,
      data_compra: data?.data?.purchase?.approved_date
    };

    console.log('👤 Dados processados:', comprador);

    // Se for compra aprovada e tiver email, criar no GoHighLevel
    if (data.event === 'PURCHASE_APPROVED' && comprador.email) {
      console.log('💰 Compra aprovada! Criando contato no GoHighLevel...');
      const resultado = await criarNoGoHighLevel(comprador);
      
      return res.status(200).json({ 
        sucesso: true,
        mensagem: 'Compra processada e contato criado no GoHighLevel!',
        comprador: comprador.email,
        ghl_contato_id: resultado?.contact?.id
      });
    }
    
    // Para outros eventos
    return res.status(200).json({ 
      sucesso: true,
      mensagem: `Evento ${data.event} recebido mas não processado`,
      evento: data.event
    });

  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    return res.status(500).json({ 
      erro: 'Erro interno do servidor', 
      detalhes: error.message,
      stack: error.stack 
    });
  }
}

async function criarNoGoHighLevel(comprador) {
  try {
    console.log('🎯 Iniciando criação no GoHighLevel...');
    
    // Dados para criar o contato
    const dadosContato = {
      locationId: process.env.GHL_LOCATION_ID,
      firstName: comprador.nome.split(' ')[0] || 'Cliente',
      lastName: comprador.nome.split(' ').slice(1).join(' ') || 'Hotmart',
      email: comprador.email,
      phone: comprador.telefone || '',
      tags: [
        'hotmart-cliente',
        'compra-aprovada',
        comprador.produto ? comprador.produto.toLowerCase().replace(/\s+/g, '-') : 'produto-hotmart'
      ],
      customFields: {
        'hotmart_transaction': comprador.transacao || '',
        'purchase_value': comprador.valor || 0,
        'purchase_date': comprador.data_compra || new Date().toISOString(),
        'product_name': comprador.produto || 'Produto Hotmart'
      }
    };

    console.log('📝 Enviando dados para GoHighLevel:', JSON.stringify(dadosContato, null, 2));

    // Fazer requisição para GoHighLevel
    const response = await axios.post(
      'https://services.leadconnectorhq.com/contacts/',
      dadosContato,
      {
        headers: {
          'Authorization': `Bearer ${process.env.GHL_API_KEY}`,
          'Version': '2021-07-28',
          'Content-Type': 'application/json'
        },
        timeout: 10000 // 10 segundos de timeout
      }
    );

    console.log('✅ Sucesso! Contato criado no GoHighLevel');
    console.log('📋 Resposta GHL:', JSON.stringify(response.data, null, 2));
    
    return response.data;

  } catch (error) {
    console.error('❌ Erro ao criar contato no GoHighLevel:');
    console.error('Status:', error.response?.status);
    console.error('Data:', JSON.stringify(error.response?.data, null, 2));
    console.error('Message:', error.message);
    
    throw new Error(`Erro GoHighLevel: ${error.response?.data?.message || error.message}`);
  }
}
