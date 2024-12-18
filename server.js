const express = require('express');
const cors = require('cors');
const axios = require('axios');
const { v4: uuidv4 } = require('uuid'); // Para gerar UUIDs
require('dotenv').config();

const app = express();
const PORT = 3200;

app.use(cors());
app.use(express.json());

//rota para detectar os metodos de pagamento
app.post('/get-payment-methods', async (req, res) => {
    try {
        const { bin } = req.body;
        console.log(`BIN recebido: ${bin}`);

        const response = await axios.get(`https://api.mercadopago.com/v1/payment_methods/search?bin=${bin}&site_id=MLB`, {
            headers: {
                'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`
            }
        });

        console.log('Resposta da API do Mercado Pago:', response.data);

        // Filtra os resultados para encontrar cartões de crédito ou débito com status ativo
        const paymentMethod = response.data.results.find(method =>
            (method.payment_type_id === 'credit_card' || method.payment_type_id === 'debit_card') &&
            method.status === 'active'
        );

        if (paymentMethod) {
            res.json({ paymentMethodId: paymentMethod.id });
        } else {
            res.status(404).json({ error: 'Nenhuma bandeira de cartão válida encontrada' });
        }
    } catch (error) {
        console.error('Erro ao buscar a bandeira do cartão:', error.response ? error.response.data : error.message);
        res.status(500).json({ error: 'Erro ao buscar a bandeira do cartão' });
    }
});





// Rota para processar pagamento (Crédito e Débito)
app.post('/process-payment', async (req, res) => {
    try {
        const idempotencyKey = uuidv4();
        console.log('Requisição recebida para pagamento:', req.body);

        const response = await axios.post('https://api.mercadopago.com/v1/payments', req.body, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`,
                'X-Idempotency-Key': idempotencyKey
            }
        });

        console.log('Resposta da API do Mercado Pago:', response.data);
        res.json(response.data);
    } catch (error) {
        console.error('Erro ao processar pagamento:', error.response ? error.response.data : error.message);
        res.status(error.response?.status || 500).json({ error: error.response?.data || error.message });
    }
});



// Rota para gerar pagamento Pix
app.post('/generate-pix', async (req, res) => {
    try {
        const { cpf } = req.body;
        const idempotencyKey = uuidv4();

        const paymentData = {
            transaction_amount: 100, // Valor do pagamento em reais (ex: 100 para R$100,00)
            description: 'Pagamento via Pix',
            payment_method_id: 'pix',
            payer: {
                email: 'fabioavsouza@outlook.com', // E-mail fictício para teste
                first_name: 'Fulano',
                last_name: 'Ciclano',
                identification: {
                    type: 'CPF',
                    number: cpf
                }
            }
        };

        console.log('Requisição recebida para pagamento Pix:', paymentData);

        const response = await axios.post('https://api.mercadopago.com/v1/payments', paymentData, {
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${process.env.MP_ACCESS_TOKEN}`,
                'X-Idempotency-Key': idempotencyKey
            }
        });

        const pixCode = response.data.point_of_interaction.transaction_data.qr_code;

        res.json({ pixCode });
    } catch (error) {
        console.error('Erro ao gerar pagamento Pix:', error.response ? error.response.data : error.message);
        res.status(error.response?.status || 500).json({ error: error.response?.data || error.message });
    }
});


// Inicia o servidor
app.listen(PORT, () => {
    console.log(`Servidor rodando em http://147.93.15.46:${PORT}`);
});
