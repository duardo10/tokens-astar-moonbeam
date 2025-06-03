require('dotenv').config();

console.log('Debug do arquivo .env');
console.log('PRIVATE_KEY:', process.env.PRIVATE_KEY ? 'Configurado' : 'Não encontrado');
console.log('PRIVATE_KEY exists:', !!process.env.PRIVATE_KEY);
console.log('PRIVATE_KEY length:', process.env.PRIVATE_KEY ? process.env.PRIVATE_KEY.length : 0);
console.log('PRIVATE_KEY (first 10 chars):', process.env.PRIVATE_KEY ? process.env.PRIVATE_KEY.substring(0, 10) : 'undefined'); 