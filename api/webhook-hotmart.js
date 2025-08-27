// Substitua o conteúdo do seu arquivo webhook atual por este código

export default async function handler(req, res) {
  // Permitir apenas POST
  if (req.method !== 'POST') {
    return res.status(405).json({ 
      erro: true, 
      mensagem: 'Método não permitido' 
    });
  }

  try {
    console.log('📨 Webhook recebido da Hotmart:', {
      headers: req.headers,
      body: req.body
    });

    const { event, data } = req.body;

    // Validar estrutura básica
    if (!event || !data) {
      return res.status(400).json({
        erro: true,
        mensagem: 'Estrutura de dados inválida'
      });
    }

    // Verificar se as env vars estão configuradas
    if (!process.env.GHL_ACCESS_TOKEN) {
      console.error('❌ GHL_ACCESS_TOKEN não configurado');
      return res.status(500).json({
        erro: true,
        mensagem: 'Token GHL não configurado',
        api_key_exists: false
      });
    }

    if (!process.env.GHL_LOCATION_ID) {
      console.error('❌ GHL_LOCATION_ID não configurado');
      return res.status(500).json({
        erro: true,
        mensagem: 'Location ID não configurado',
        api_key_exists: true,
        location_id: 'missing'
      });
    }

    console.log('✅ Configurações OK:', {
      api_key_exists: true,
      location_id: process.env.GHL_LOCATION_ID.substring(0, 8) + '...'
    });

    let resultado;

    // Processar diferentes eventos
    switch (event) {
      case 'PURCHASE_COMPLETE':
      case 'PURCHASE_APPROVED':
        resultado = await processarCompra(data);
        break;
      
      case 'PURCHASE_REFUNDED':
        resultado = await processarReembolso(data);
        break;
      
      case 'SUBSCRIPTION_CANCELLATION':
        resultado = await processarCancelamento(data);
        break;
      
      default:
        console.log('ℹ️ Evento não processado:', event);
        return res.status(200).json({
          erro: false,
          mensagem: `Evento ${event} recebido mas não processado`
        });
    }

    return res.status(200).json({
      erro: false,
      mensagem: 'Processado com sucesso',
      evento: event,
      resultado,
      api_key_exists: true,
      location_id: process.env.GHL_LOCATION_ID.substring(0, 8) + '...'
    });

  } catch (error) {
    console.error('❌ Erro no webhook:', error);
    
    return res.status(500).json({
      erro: true,
      mensagem: error.message,
      api_key_exists: !!process.env.GHL_ACCESS_TOKEN,
      location_id: process.env.GHL_LOCATION_ID?.substring(0, 8) + '...' || 'missing',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

async function processarCompra(data) {
  console.log('💰 Processando compra:', data);
  
  const buyer = data.buyer || data.subscriber;
  const product = data.product;
  
  if (!buyer?.email) {
    throw new Error('Email do comprador não encontrado');
  }

  // Criar contato no GoHighLevel
  const contact = await criarContato({
    firstName: buyer.name?.split(' ')[0] || 'Cliente',
    lastName: buyer.name?.split(' ').slice(1).join(' ') || '',
    email: buyer.email,
    phone: buyer.phone || '',
    locationId: process.env.GHL_LOCATION_ID,
    customFields: {
      produto_hotmart: product?.name || 'Produto Hotmart',
      data_compra: new Date().toISOString(),
      evento: 'compra_aprovada'
    },
    tags: ['cliente-hotmart', 'compra-aprovada']
  });

  return {
    acao: 'compra_processada',
    contato_id: contact.id,
    email: buyer.email,
    produto: product?.name
  };
}

async function processarReembolso(data) {
  console.log('💸 Processando reembolso:', data);
  
  const buyer = data.buyer || data.subscriber;
  
  if (!buyer?.email) {
    throw new Error('Email do comprador não encontrado');
  }

  // Buscar contato existente e adicionar tag de reembolso
  const contact = await buscarOuCriarContato(buyer.email, {
    firstName: buyer.name?.split(' ')[0] || 'Cliente',
    lastName: buyer.name?.split(' ').slice(1).join(' ') || '',
    tags: ['reembolso-hotmart']
  });

  return {
    acao: 'reembolso_processado',
    contato_id: contact.id,
    email: buyer.email
  };
}

async function processarCancelamento(data) {
  console.log('❌ Processando cancelamento:', data);
  
  const subscriber = data.subscriber || data.buyer;
  
  if (!subscriber?.email) {
    throw new Error('Email do assinante não encontrado');
  }

  const contact = await buscarOuCriarContato(subscriber.email, {
    firstName: subscriber.name?.split(' ')[0] || 'Cliente',
    lastName: subscriber.name?.split(' ').slice(1).join(' ') || '',
    tags: ['cancelamento-hotmart']
  });

  return {
    acao: 'cancelamento_processado',
    contato_id: contact.id,
    email: subscriber.email
  };
}

// FUNÇÕES DO GOHIGHLEVEL (usando fetch nativo)

async function criarContato(dadosContato) {
  console.log('👤 Criando contato:', dadosContato.email);
  
  const url = 'https://services.leadconnectorhq.com/contacts/';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.GHL_ACCESS_TOKEN}`,
      'Version': '2021-07-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(dadosContato)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('Erro ao criar contato:', errorText);
    throw new Error(`GHL retornou erro: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log('✅ Contato criado:', result.contact?.id);
  
  return result.contact || result;
}

async function buscarOuCriarContato(email, dadosBackup) {
  console.log('🔍 Buscando contato:', email);
  
  try {
    // Buscar contato existente
    const searchUrl = 'https://services.leadconnectorhq.com/contacts/search/duplicate';
    
    const searchResponse = await fetch(searchUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GHL_ACCESS_TOKEN}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        email: email,
        locationId: process.env.GHL_LOCATION_ID
      })
    });

    if (searchResponse.ok) {
      const searchResult = await searchResponse.json();
      
      if (searchResult.contacts && searchResult.contacts.length > 0) {
        console.log('✅ Contato existente encontrado');
        const contact = searchResult.contacts[0];
        
        // Adicionar tags se fornecidas
        if (dadosBackup.tags) {
          await adicionarTags(contact.id, dadosBackup.tags);
        }
        
        return contact;
      }
    }

    // Se não encontrou, criar novo contato
    console.log('➕ Criando novo contato');
    return await criarContato({
      ...dadosBackup,
      email: email,
      locationId: process.env.GHL_LOCATION_ID
    });

  } catch (error) {
    console.error('Erro ao buscar/criar contato:', error);
    throw error;
  }
}

async function adicionarTags(contactId, tags) {
  console.log('🏷️ Adicionando tags:', tags);
  
  const url = `https://services.leadconnectorhq.com/contacts/${contactId}/tags`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.GHL_ACCESS_TOKEN}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ tags })
    });

    if (response.ok) {
      console.log('✅ Tags adicionadas com sucesso');
    } else {
      console.log('⚠️ Erro ao adicionar tags:', response.status);
    }
  } catch (error) {
    console.error('Erro ao adicionar tags:', error);
  }
}
