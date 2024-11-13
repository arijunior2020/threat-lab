require('dotenv').config();
const express = require('express');
const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');
const sequelize = require('./database');
const User = require('./models/user');

AWS.config.update({ region: process.env.AWS_REGION });

const cognito = new AWS.CognitoIdentityServiceProvider();
const s3 = new AWS.S3();
const app = express();

app.use(express.json());

// Função de log no S3
async function logToS3(logMessage) {
    const params = {
        Bucket: process.env.S3_BUCKET_NAME,
        Key: `logs/${Date.now()}.txt`,
        Body: logMessage,
    };
    await s3.upload(params).promise();
}

// Função de login com Cognito
async function cognitoLogin(username, password) {
    const params = {
        AuthFlow: 'USER_PASSWORD_AUTH',
        ClientId: process.env.COGNITO_CLIENT_ID,
        AuthParameters: { USERNAME: username, PASSWORD: password },
    };
    const data = await cognito.initiateAuth(params).promise();
    return data.AuthenticationResult.IdToken;
}

// Rota de login
app.post('/login', async (req, res) => {
    const { username, password } = req.body;
    try {
        const token = await cognitoLogin(username, password);
        await logToS3(`Usuário ${username} logado com sucesso.`);
        res.json({ token });
    } catch (error) {
        await logToS3(`Falha de login para o usuário ${username}.`);
        res.status(401).json({ message: 'Credenciais inválidas' });
    }
});

// Inicialização do banco de dados e servidor
sequelize.sync().then(() => console.log('Banco de dados sincronizado'));
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Servidor rodando na porta ${PORT}`));
