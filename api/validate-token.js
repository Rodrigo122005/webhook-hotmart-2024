// api/validate-token.js - Endpoint para validar token do GoHighLevel

export default async function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    console.log('🔍 Validando token GoHighLevel...');
    
    const token = process.env.GHL_ACCESS_TOKEN;
    const locationId = process.env.GHL_LOCATION_ID;
    
    if (!token) {
      return res.status(400).json({
        valid: false,
        error: 'GHL_ACCESS_TOKEN não configurado'
      });
    }

    if (!locationId) {
      return res.status(400).json({
        valid: false,
        error: 'GHL_LOCATION_ID não configurado'
      });
    }

    // Teste 1: Verificar se o token é válido
    const response = await fetch('https://services.leadconnectorhq.com/locations/', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json'
      }
    });

    if (response.status === 401) {
      return res.status(200).json({
        valid: false,
        error: 'Token inválido ou expirado',
        action: 'Gere um novo token no GoHighLevel'
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      return res.status(200).json({
        valid: false,
        error: `Erro ${response.status}: ${errorText}`
      });
    }

    const locations = await response.json();
    
    // Teste 2: Verificar se a location existe
    const location = locations.locations?.find(loc => loc.id === locationId);
    
    if (!location) {
      return res.status(200).json({
        valid: false,
        error: 'Location ID não encontrado',
        available_locations: locations.locations?.map(loc => ({
          id: loc.id,
          name: loc.name
        }))
      });
    }

    // Teste 3: Verificar permissões para contatos
    const contactsTest = await fetch(`https://services.leadconnectorhq.com/contacts/?locationId=${locationId}&limit=1`, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Version': '2021-07-28',
        'Content-Type': 'application/json'
      }
    });

    const hasContactsPermission = contactsTest.ok;

    return res.status(200).json({
      valid: true,
      token_status: 'Válido',
      location: {
        id: location.id,
        name: location.name
      },
      permissions: {
        locations: true,
        contacts: hasContactsPermission
      },
      message: '✅ Token funcionando corretamente!'
    });

  } catch (error) {
    console.error('Erro na validação:', error);
    
    return res.status(500).json({
      valid: false,
      error: error.message
    });
  }
}
