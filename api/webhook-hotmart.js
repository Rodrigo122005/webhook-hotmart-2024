// api/webhook-hotmart.js - Versão corrigida sem axios

export default async function handler(req, res) {
  console.log('🔥 Webhook Hotmart iniciado:', new Date().toISOString());
  
  // CORS headers para desenvolvimento
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ 
      erro: true, 
      mensagem: 'Método não permitido - use POST' 
    });
  }

  try {
    // Log completo dos dados recebidos
    console.log('📨 Headers recebidos:', JSON.stringify(req.headers, null, 2));
    console.log('📨 Body recebido:', JSON.stringify(req.body, null, 2));

    const { event, data } = req.body;

    // Validação básica dos dados
    if (!event) {
      return res.status(400).json({
        erro: true,
        mensagem: 'Campo "event" ausente no webhook'
      });
    }

    if (!data) {
      return res.status(400).json({
        erro: true,
        mensagem: 'Campo "data" ausente no webhook'
      });
    }

    // Verificar configurações
    const token = process.env.GHL_ACCESS_TOKEN;
    const locationId = process.env.GHL_LOCATION_ID;

    console.log('🔧 Verificando configurações:', {
      token_exists: !!token,
      token_length: token ? token.length : 0,
      location_id: locationId ? locationId.substring(0, 8) + '...' : 'missing'
    });

    if (!token) {
      console.error('❌ GHL_ACCESS_TOKEN não configurado');
      return res.status(500).json({
        erro: true,
        mensagem: 'Token GoHighLevel não configurado',
        api_key_exists: false,
        location_id: locationId || 'missing'
      });
    }

    if (!locationId) {
      console.error('❌ GHL_LOCATION_ID não configurado');
      return res.status(500).json({
        erro: true,
        mensagem: 'Location ID GoHighLevel não configurado',
        api_key_exists: true,
        location_id: 'missing'
      });
    }

    console.log('✅ Configurações válidas, processando evento:', event);

    // Processar diferentes tipos de eventos
    let resultado;
    
    switch (event) {
      case 'PURCHASE_COMPLETE':
      case 'PURCHASE_APPROVED':
        console.log('💰 Processando compra aprovada...');
        resultado = await processarCompraHotmart(data, token, locationId);
        break;
      
      case 'PURCHASE_REFUNDED':
        console.log('💸 Processando reembolso...');
        resultado = await processarReembolsoHotmart(data, token, locationId);
        break;
      
      case 'SUBSCRIPTION_CANCELLATION':
        console.log('❌ Processando cancelamento...');
        resultado = await processarCancelamentoHotmart(data, token, locationId);
        break;
      
      default:
        console.log('ℹ️ Evento não processado:', event);
        return res.status(200).json({
          erro: false,
          mensagem: `Evento ${event} recebido mas não processado`,
          event_type: event,
          api_key_exists: true,
          location_id: locationId.substring(0, 8) + '...'
        });
    }

    // Resposta de sucesso
    return res.status(200).json({
      erro: false,
      mensagem: 'Webhook processado com sucesso',
      evento: event,
      resultado: resultado,
      timestamp: new Date().toISOString(),
      api_key_exists: true,
      location_id: locationId.substring(0, 8) + '...'
    });

  } catch (error) {
    console.error('❌ ERRO no webhook:', error);
    console.error('❌ Stack trace:', error.stack);
    
    return res.status(500).json({
      erro: true,
      mensagem: error.message,
      error_type: error.name,
      api_key_exists: !!process.env.GHL_ACCESS_TOKEN,
      location_id: process.env.GHL_LOCATION_ID?.substring(0, 8) + '...' || 'missing',
      timestamp: new Date().toISOString(),
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  }
}

// === FUNÇÕES ESPECÍFICAS PARA HOTMART ===

async function processarCompraHotmart(data, token, locationId) {
  console.log('🛒 Iniciando processamento de compra Hotmart');
  
  // Extrair dados do comprador (Hotmart pode usar buyer ou subscriber)
  const buyer = data.buyer || data.subscriber || {};
  const product = data.product || {};
  const purchase = data.purchase || data.commision || {};
  
  console.log('📋 Dados extraídos:', {
    buyer_name: buyer.name,
    buyer_email: buyer.email,
    buyer_phone: buyer.phone,
    product_name: product.name,
    product_id: product.id,
    transaction: purchase.transaction
  });

  // Validação obrigatória
  if (!buyer.email) {
    throw new Error('Email do comprador não encontrado nos dados da Hotmart');
  }

  // Preparar dados do contato para GoHighLevel
  const firstName = buyer.name ? buyer.name.trim().split(' ')[0] : 'Cliente';
  const lastName = buyer.name ? buyer.name.trim().split(' ').slice(1).join(' ') : 'Hotmart';
  
  const contactData = {
    firstName: firstName,
    lastName: lastName,
    email: buyer.email.toLowerCase().trim(),
    phone: buyer.phone || buyer.checkout_phone || '',
    locationId: locationId,
    tags: ['cliente-hotmart', 'compra-aprovada'],
    customFields: [
      {
        key: 'source',
        field_value: 'Hotmart'
      },
      {
        key: 'produto_hotmart',
        field_value: product.name || 'Produto Hotmart'
      },
      {
        key: 'produto_id',
        field_value: product.id ? product.id.toString() : 'N/A'
      },
      {
        key: 'data_compra',
        field_value: new Date().toISOString()
      },
      {
        key: 'transacao_hotmart',
        field_value: purchase.transaction || 'N/A'
      },
      {
        key: 'valor_compra',
        field_value: purchase.price?.value ? purchase.price.value.toString() : '0'
      }
    ]
  };

  console.log('📤 Enviando para GoHighLevel:', contactData);

  // Criar/atualizar contato no GoHighLevel
  const contact = await criarOuAtualizarContatoGHL(contactData, token);
  
  console.log('✅ Compra processada - Contato ID:', contact.id);
  
  return {
    acao: 'compra_processada',
    contato_id: contact.id,
    email: buyer.email,
    nome: buyer.name,
    produto: product.name || 'Produto Hotmart',
    transacao: purchase.transaction
  };
}

async function processarReembolsoHotmart(data, token, locationId) {
  console.log('💸 Processando reembolso Hotmart');
  
  const buyer = data.buyer || data.subscriber || {};
  
  if (!buyer.email) {
    throw new Error('Email do comprador não encontrado para reembolso');
  }

  // Buscar contato existente e adicionar tag de reembolso
  const contact = await buscarOuCriarContatoSimples(
    buyer.email, 
    buyer.name || 'Cliente Reembolso',
    token, 
    locationId,
    ['reembolso-hotmart', 'cliente-inativo']
  );

  return {
    acao: 'reembolso_processado',
    contato_id: contact.id,
    email: buyer.email,
    nome: buyer.name
  };
}

async function processarCancelamentoHotmart(data, token, locationId) {
  console.log('❌ Processando cancelamento Hotmart');
  
  const subscriber = data.subscriber || data.buyer || {};
  
  if (!subscriber.email) {
    throw new Error('Email não encontrado para cancelamento de assinatura');
  }

  const contact = await buscarOuCriarContatoSimples(
    subscriber.email,
    subscriber.name || 'Assinante Cancelado',
    token,
    locationId,
    ['cancelamento-hotmart', 'assinatura-cancelada']
  );

  return {
    acao: 'cancelamento_processado',
    contato_id: contact.id,
    email: subscriber.email,
    nome: subscriber.name
  };
}

// === FUNÇÕES DA API GOHIGHLEVEL (SEM AXIOS) ===

async function criarOuAtualizarContatoGHL(contactData, token) {
  console.log('🔄 Criando/atualizando contato no GoHighLevel...');
  
  // Primeiro, tentar buscar contato existente
  try {
    const contatoExistente = await buscarContatoPorEmail(contactData.email, contactData.locationId, token);
    
    if (contatoExistente) {
      console.log('🔄 Atualizando contato existente:', contatoExistente.id);
      return await atualizarContatoGHL(contatoExistente.id, contactData, token);
    }
  } catch (error) {
    console.log('⚠️ Erro ao buscar contato existente, criando novo:', error.message);
  }

  // Se não encontrou ou deu erro, criar novo
  console.log('➕ Criando novo contato...');
  return await criarNovoContatoGHL(contactData, token);
}

async function criarNovoContatoGHL(contactData, token) {
  const url = 'https://services.leadconnectorhq.com/contacts/';
  
  console.log('📤 POST para:', url);
  console.log('📤 Dados:', JSON.stringify(contactData, null, 2));
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Version': '2021-07-28',
      'Content-Type': 'application/json',
      'Accept': 'application/json'
    },
    body: JSON.stringify(contactData)
  });

  console.log('📡 Status da resposta:', response.status);
  console.log('📡 Headers da resposta:', Object.fromEntries(response.headers.entries()));

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Erro na resposta GHL:', errorText);
    throw new Error(`GHL retornou erro: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log('✅ Contato criado:', result);
  
  return result.contact || result;
}

async function atualizarContatoGHL(contactId, contactData, token) {
  const url = `https://services.leadconnectorhq.com/contacts/${contactId}`;
  
  console.log('📤 PUT para:', url);
  
  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Version': '2021-07-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(contactData)
  });

  if (!response.ok) {
    const errorText = await response.text();
    console.error('❌ Erro ao atualizar contato:', errorText);
    throw new Error(`Erro ao atualizar contato: ${response.status} - ${errorText}`);
  }

  const result = await response.json();
  console.log('✅ Contato atualizado:', result);
  
  return result.contact || result;
}

async function buscarContatoPorEmail(email, locationId, token) {
  const url = 'https://services.leadconnectorhq.com/contacts/search/duplicate';
  
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Version': '2021-07-28',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      email: email,
      locationId: locationId
    })
  });

  if (!response.ok) {
    throw new Error(`Erro na busca: ${response.status}`);
  }

  const result = await response.json();
  
  if (result.contacts && result.contacts.length > 0) {
    console.log('✅ Contato existente encontrado:', result.contacts[0].id);
    return result.contacts[0];
  }
  
  return null;
}

async function buscarOuCriarContatoSimples(email, nome, token, locationId, tags = []) {
  try {
    // Buscar existente
    const existing = await buscarContatoPorEmail(email, locationId, token);
    
    if (existing) {
      // Adicionar novas tags
      if (tags.length > 0) {
        await adicionarTagsContato(existing.id, tags, token);
      }
      return existing;
    }

    // Criar novo
    const contactData = {
      firstName: nome.split(' ')[0] || 'Cliente',
      lastName: nome.split(' ').slice(1).join(' ') || 'Hotmart',
      email: email,
      locationId: locationId,
      tags: tags
    };

    return await criarNovoContatoGHL(contactData, token);
    
  } catch (error) {
    console.error('Erro ao buscar/criar contato simples:', error);
    throw error;
  }
}

async function adicionarTagsContato(contactId, tags, token) {
  const url = `https://services.leadconnectorhq.com/contacts/${contactId}/tags`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ tags })
    });

    if (response.ok) {
      console.log('✅ Tags adicionadas:', tags);
    } else {
      console.log('⚠️ Erro ao adicionar tags:', response.status);
    }
  } catch (error) {
    console.error('Erro ao adicionar tags:', error);
  }
}
