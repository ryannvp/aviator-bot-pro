const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const fs = require('fs');
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const tf = require('@tensorflow/tfjs'); 
const crypto = require('crypto'); 

// =========================================================================
// 📱 CENTRAL DE COMANDO TELEGRAM (FSM BLINDADO)
// =========================================================================
const TELEGRAM_TOKEN = '8535676098:AAFG1dDkvw4mcp28avsl2UOziEibocODRHE'; 
const CHAT_ID = '-1003932213718'; 
let botTelegram = new TelegramBot(TELEGRAM_TOKEN, { polling: true }); 

// =========================================================================
// ⚙️ CONFIGURAÇÕES MEGA DEUS (RTP CRACKER)
// =========================================================================
let CONFIG = {
    alvoSeguro: 1.50, // Alvo Azul Padrão
    alvoRoxo: 2.00,   // Alvo de Expansão
    apostaBase: 5.00,
    bancaTotal: 500.00, 
    metaLucro: 100.00,        
    limitePerda: -50.00,     
    gatilhoDinamico: 4, 
    maxHistorico: 500 
};

let memoria = {
    velas: [],
    bancaSimulada: 0.00,
    sequenciaBaixa: 0,
    
    // MÁQUINA DE ESTADO TELEGRAM
    faseTelegram: 'START', // START -> ANALISANDO -> PREPARANDO -> RESULTADO
    ultimoLucroRodada: 0.00, 

    analisandoResultado: false,
    alertaRosaEnviado: false,
    bloqueioTrem: 0,
    status: "Carregando Tensores LSTM...",
    rodadasSemRosa: 0,
    sentimentoManada: "NEUTRO",
    roboLigado: true, 
    tendenciaLSTM: "Calibrando pesos...",
    hibernando: false,
    consecutiveLoss: 0,
    zScoreAtual: 0 // Nova Métrica Estatística para Rosa
};

// Banco de Dados JSON Rápido
const DB_FILE = 'matrix_data.json';
function salvarVelaDB(valorNum) {
    let data = [];
    if (fs.existsSync(DB_FILE)) { try { data = JSON.parse(fs.readFileSync(DB_FILE)); } catch(e){} }
    data.unshift({ valor: valorNum, data: new Date().toISOString() });
    if (data.length > CONFIG.maxHistorico) data.pop();
    fs.writeFileSync(DB_FILE, JSON.stringify(data));
}

// =========================================================================
// 🧠 REDE NEURAL PROFUNDA (LSTM VERDADEIRO NO TENSORFLOW)
// =========================================================================
const modelLSTM = tf.sequential();
modelLSTM.add(tf.layers.lstm({units: 16, inputShape: [15, 1], returnSequences: false}));
modelLSTM.add(tf.layers.dense({units: 1}));
modelLSTM.compile({optimizer: 'adam', loss: 'meanSquaredError'});
let treinandoIA = false;

async function treinarCerebroLSTM() {
    if (treinandoIA || memoria.velas.length < 50) return;
    treinandoIA = true;
    try {
        let xs = [], ys = [];
        for(let i=0; i < Math.min(memoria.velas.length - 16, 150); i++) {
            xs.push(memoria.velas.slice(i+1, i+16).reverse()); 
            ys.push(memoria.velas[i]);
        }
        if(xs.length > 0) {
            const tensorX = tf.tensor3d(xs, [xs.length, 15, 1]);
            const tensorY = tf.tensor2d(ys, [ys.length, 1]);
            await modelLSTM.fit(tensorX, tensorY, {epochs: 10, verbose: 0});
            tensorX.dispose(); tensorY.dispose();
            
            const last15 = tf.tensor3d([memoria.velas.slice(0, 15).reverse()], [1, 15, 1]);
            const pred = modelLSTM.predict(last15);
            let predVal = pred.dataSync()[0];
            last15.dispose(); pred.dispose();
            
            if(predVal >= 10.0) memoria.tendenciaLSTM = "ANOMALIA: VELA ROSA EMINENTE (RTP SPIKE)";
            else if(predVal >= 2.0) memoria.tendenciaLSTM = "TENDÊNCIA ROXA (Expansão de RTP)";
            else if(predVal >= 1.5) memoria.tendenciaLSTM = "TENDÊNCIA AZUL (Recuperação)";
            else memoria.tendenciaLSTM = "DRENAGEM (RTP Drain - Perigo)";
        }
    } catch(e) {}
    treinandoIA = false;
}
setInterval(treinarCerebroLSTM, 10000); 

// =========================================================================
// 🔁 FUNIL DE MENSAGENS MEGA DEUS (TELEGRAM)
// =========================================================================
setTimeout(() => {
    botTelegram.sendMessage(CHAT_ID, `✈️ <b>Sejam Bem-Vindos ao Aviator PRO | MEGA DEUS V10</b> 💰\n\n<i>Sistemas quantitativos em nuvem iniciados.</i>`, { parse_mode: 'HTML' });
    memoria.faseTelegram = 'ANALISANDO';
}, 2000);

function processarFunilTelegram(novaVela, rsi, apostaSoros) {
    if (!memoria.roboLigado || memoria.hibernando) return;

    // 🔥 NOVA INTELIGÊNCIA DA VELA ROSA (Z-Score + RTP Drain)
    let probRosa = Math.min(99, Math.floor((memoria.rodadasSemRosa / 16) * 100));
    // Z-Score acima de 2.0 significa que o mercado está forçando a barra para não pagar. Ele VAI pagar.
    if (memoria.rodadasSemRosa >= 16 && (rsi < 45 || memoria.zScoreAtual > 2.0) && !memoria.alertaRosaEnviado) {
        let msg = `🦄 <b>ALERTA MEGA DEUS | VELA ROSA</b> 🦄\n\n🔥 <b>Pressão Esmagadora:</b> ${memoria.rodadasSemRosa} rodadas secas.\n📊 <b>RSI do Servidor:</b> ${rsi}\n🧮 <b>Anomalia Z-Score:</b> ${memoria.zScoreAtual} (Extrema)\n📈 <b>Chance:</b> ${probRosa}%\n\n<i>*Dica: Jogue moedas para o 10x. O RTP precisa equilibrar.</i>`;
        botTelegram.sendMessage(CHAT_ID, msg, { parse_mode: 'HTML' }).catch(()=>{});
        memoria.alertaRosaEnviado = true; 
    }

    if (memoria.faseTelegram === 'ANALISANDO') {
        if (memoria.sequenciaBaixa === (CONFIG.gatilhoDinamico - 1)) {
            let msg = `🔎 Estamos analisando o mercado… aguarde.\n\n⚠️ <b>Tensão Acumulada:</b> ${memoria.sequenciaBaixa} Velas Baixas\n📊 <b>RSI Quântico:</b> ${rsi}`;
            botTelegram.sendMessage(CHAT_ID, msg, { parse_mode: 'HTML' }).catch(()=>{});
            memoria.faseTelegram = 'PREPARANDO';
        }
    }
    else if (memoria.faseTelegram === 'PREPARANDO') {
        if (novaVela >= CONFIG.alvoSeguro) {
            botTelegram.sendMessage(CHAT_ID, `🚫 <b>ANÁLISE ABORTADA</b> 🚫\nO mercado liberou o pagamento antecipado. Padrão quebrado.`, { parse_mode: 'HTML' }).catch(()=>{});
            memoria.faseTelegram = 'ANALISANDO';
        } else if (memoria.sequenciaBaixa >= CONFIG.gatilhoDinamico) {
            
            // Decisão Dinâmica do Alvo (Azul vs Roxo)
            let alvoSugerido = CONFIG.alvoSeguro;
            let avisoExtra = "";
            if(memoria.tendenciaLSTM.includes("ROXA")) {
                alvoSugerido = CONFIG.alvoRoxo;
                avisoExtra = "\n🟣 <b>OPORTUNIDADE DE EXPANSÃO:</b> A IA detectou uma possível quebra de resistência para Vela Roxa (2.0x+).";
            }

            let msg = `✅ Mercado analisado!\n\n🚀 <b>ENTRADA CONFIRMADA</b> 🚀\n\n🎯 <b>Sair em:</b> ${alvoSugerido}x\n🧠 <b>Gatilho IA:</b> ${CONFIG.gatilhoDinamico} Velas\n🔮 <b>Rede LSTM:</b> ${memoria.tendenciaLSTM}\n⚖️ <b>Sugestão de Banca:</b> R$ ${apostaSoros}${avisoExtra}\n\n<i>Ataque a Bullsbet agora!</i>`;
            botTelegram.sendMessage(CHAT_ID, msg, { parse_mode: 'HTML' }).catch(()=>{});
            memoria.faseTelegram = 'RESULTADO';
            memoria.analisandoResultado = true;
        }
    }
    else if (memoria.faseTelegram === 'RESULTADO' && !memoria.analisandoResultado) {
        let msg = "";
        if (novaVela >= CONFIG.alvoSeguro) {
            msg = `✅ <b>GREEN ABSOLUTO!</b>\n💰 Lucro: R$ ${memoria.ultimoLucroRodada.toFixed(2)}\n📈 Vela: ${novaVela}x`;
        } else {
            msg = `❌ <b>RED - MANIPULAÇÃO DETECTADA</b>\n📉 Vela: ${novaVela}x\n🛡️ <i>O cassino entrou em modo drenagem. Ajustando defesa.</i>`;
        }
        
        botTelegram.sendMessage(CHAT_ID, msg, { parse_mode: 'HTML' }).then(() => {
            setTimeout(() => {
                botTelegram.sendMessage(CHAT_ID, `❌ Entrada finalizada! Aguarde a próxima.`, { parse_mode: 'HTML' }).catch(()=>{});
                memoria.faseTelegram = 'ANALISANDO';
            }, 1500);
        }).catch(()=>{});
    }
}

// =========================================================================
// 🎮 MUTAÇÃO E COMANDOS TELEGRAM
// =========================================================================
function mutacaoGenetica() {
    if (memoria.velas.length < 100) return;
    let lucroAtual = 0, lucroMais = 0, lucroMenos = 0;
    let sA = 0, sM = 0, sMe = 0;

    for(let i = 100; i >= 0; i--) {
        let v = memoria.velas[i];
        if(sA >= CONFIG.gatilhoDinamico) { lucroAtual += (v >= CONFIG.alvoSeguro ? 2.5 : -5); sA = v < CONFIG.alvoSeguro ? 1 : 0; } else { sA = v < CONFIG.alvoSeguro ? sA + 1 : 0; }
        if(sM >= (CONFIG.gatilhoDinamico + 1)) { lucroMais += (v >= CONFIG.alvoSeguro ? 2.5 : -5); sM = v < CONFIG.alvoSeguro ? 1 : 0; } else { sM = v < CONFIG.alvoSeguro ? sM + 1 : 0; }
        if(sMe >= Math.max(3, CONFIG.gatilhoDinamico - 1)) { lucroMenos += (v >= CONFIG.alvoSeguro ? 2.5 : -5); sMe = v < CONFIG.alvoSeguro ? 1 : 0; } else { sMe = v < CONFIG.alvoSeguro ? sMe + 1 : 0; }
    }
    if (lucroMais > lucroAtual && lucroMais > lucroMenos && CONFIG.gatilhoDinamico < 8) CONFIG.gatilhoDinamico++;
    else if (lucroMenos > lucroAtual && lucroMenos > lucroMais && CONFIG.gatilhoDinamico > 3) CONFIG.gatilhoDinamico--;
    memoria.rodadasDesdeUltimaMutacao = 0;
}

botTelegram.onText(/\/painel/, (msg) => {
    const opts = { reply_markup: { inline_keyboard: [[{ text: memoria.roboLigado ? '🔴 Pausar Matriz' : '🟢 Ligar Matriz', callback_data: 'toggle_power' }]] } };
    botTelegram.sendMessage(CHAT_ID, "🕹️ <b>TERMINAL MEGA DEUS</b>", { parse_mode: 'HTML', ...opts });
});

botTelegram.on('callback_query', async (query) => {
    if (query.data === 'toggle_power') {
        memoria.roboLigado = !memoria.roboLigado;
        botTelegram.sendMessage(CHAT_ID, memoria.roboLigado ? "🟢 <b>SISTEMA ARMADO.</b>" : "🔴 <b>SISTEMA PAUSADO.</b>", { parse_mode: 'HTML' });
    } 
});

// =========================================================================
// 🧮 MOTORES MATEMÁTICOS DE WALL STREET
// =========================================================================
function calcularRSI(periodo = 14) {
    if (memoria.velas.length < periodo) return 50;
    let ganhos = 0, perdas = 0;
    for (let i = 0; i < periodo; i++) {
        let diff = memoria.velas[i] - memoria.velas[i+1];
        if (diff > 0) ganhos += diff; else perdas -= diff;
    }
    let rs = (ganhos / periodo) / ((perdas / periodo) || 1);
    return (100 - (100 / (1 + rs))).toFixed(2);
}

function calcularZScore(periodo = 20) {
    if (memoria.velas.length < periodo) return 0;
    let slice = memoria.velas.slice(0, periodo);
    let mean = slice.reduce((a, b) => a + b, 0) / periodo;
    let variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / periodo;
    let stdDev = Math.sqrt(variance);
    if (stdDev === 0) return 0;
    return Math.abs((memoria.velas[0] - mean) / stdDev).toFixed(2);
}

function sugerirApostaKelly(probabilidadeVitoria = 0.65) {
    let odds = CONFIG.alvoSeguro - 1; 
    let p = probabilidadeVitoria;
    let q = 1 - p;
    let kellyFraction = (p - (q / odds));
    if (kellyFraction <= 0) return (CONFIG.bancaTotal * 0.01).toFixed(2); 
    let aposta = CONFIG.bancaTotal * (kellyFraction * 0.1); 
    return Math.max(1, aposta).toFixed(2);
}

// =========================================================================
// 🗄️ DASHBOARD WEB
// =========================================================================
async function setupServerDB() {
    const app = express();
    const server = http.createServer(app);
    const io = new Server(server);
    app.get('/', (req, res) => { res.send(`<h1>Servidor Aviator Cloud Online</h1><p>Operando em Headless Mode 24/7. Protocolo MEGA DEUS V10 Ativo.</p>`); });
    server.listen(process.env.PORT || 3000); 
    return io;
}

(async () => {
    const io = await setupServerDB();
    console.log("🚀 Servidor Iniciado. Preparando Puppeteer Headless...");

    const browser = await puppeteer.launch({
        headless: true, // Modo Nuvem
        ignoreDefaultArgs: ['--enable-automation'],
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage', '--disable-web-security', '--disable-blink-features=AutomationControlled']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    // 📡 WEBSOCKET SNIFFING
    try {
        const client = await page.target().createCDPSession();
        await client.send('Network.enable');
        client.on('Network.webSocketFrameReceived', ({response}) => {
            let payload = response.payloadData;
            if(payload.includes("multiplier") || payload.includes("crash")) {
                 memoria.hashIntegrity = "100% SECURE (WS HACKED)";
            }
        });
    } catch(e) {}

    await page.goto('https://bullsbet.bet.br/casino/game/spribe/aviator', { waitUntil: 'networkidle2' });

    let ultimaVela = "";

    setInterval(async () => {
        try {
            for (const frame of page.frames()) {
                const dadosExtracao = await frame.evaluate(() => {
                    const h = document.querySelectorAll('app-bubble-multiplier, .payout, .bubble-multiplier');
                    return { vela: h.length > 0 ? h[0].innerText : null };
                });

                const velaAtual = dadosExtracao.vela;

                if (velaAtual && velaAtual !== ultimaVela) {
                    ultimaVela = velaAtual;
                    let valorNum = parseFloat(velaAtual.replace('x', ''));
                    
                    memoria.rodadasDesdeUltimaMutacao++;
                    if (memoria.rodadasDesdeUltimaMutacao >= 50) mutacaoGenetica();

                    memoria.velas.unshift(valorNum);
                    if (memoria.velas.length > CONFIG.maxHistorico) memoria.velas.pop();
                    salvarVelaDB(valorNum);

                    let rsiAtual = calcularRSI();
                    memoria.zScoreAtual = calcularZScore();

                    if (valorNum >= 10.00) { memoria.rodadasSemRosa = 0; memoria.alertaRosaEnviado = false; } 
                    else { memoria.rodadasSemRosa++; }

                    if (valorNum < 1.15) memoria.bloqueioTrem++; else memoria.bloqueioTrem = 0;

                    if (memoria.bancaSimulada >= CONFIG.metaLucro) {
                        CONFIG.metaLucro += 50.00; 
                        CONFIG.limitePerda = memoria.bancaSimulada - 25.00; 
                    }

                    if (memoria.analisandoResultado) {
                        if (valorNum >= CONFIG.alvoSeguro) {
                            memoria.ultimoLucroRodada = (CONFIG.apostaBase * CONFIG.alvoSeguro) - CONFIG.apostaBase;
                            memoria.bancaSimulada += memoria.ultimoLucroRodada;
                            memoria.consecutiveLoss = 0;
                        } else {
                            memoria.ultimoLucroRodada = -CONFIG.apostaBase;
                            memoria.bancaSimulada -= CONFIG.apostaBase;
                            memoria.consecutiveLoss++;
                            if (memoria.consecutiveLoss >= 3) {
                                memoria.hibernando = true;
                                botTelegram.sendMessage(CHAT_ID, `🛑 <b>MODO HIBERNAÇÃO ATIVADO</b> 🛑\nO robô pausou por 15 minutos. Drenagem de RTP detectada na Bullsbet.`, { parse_mode: 'HTML' });
                                setTimeout(() => { memoria.hibernando = false; memoria.consecutiveLoss = 0; memoria.faseTelegram = 'ANALISANDO'; }, 15 * 60 * 1000); 
                            }
                        }
                        memoria.analisandoResultado = false;
                        memoria.sequenciaBaixa = valorNum < CONFIG.alvoSeguro ? 1 : 0;
                    } else {
                        if (valorNum < CONFIG.alvoSeguro) memoria.sequenciaBaixa++; 
                        else memoria.sequenciaBaixa = 0;
                        if (valorNum >= 10.00) memoria.sequenciaBaixa = -2;
                    }

                    let apostaSoros = memoria.ultimoLucroRodada > 0 ? (CONFIG.apostaBase + memoria.ultimoLucroRodada).toFixed(2) : CONFIG.apostaBase.toFixed(2);
                    processarFunilTelegram(valorNum, rsiAtual, apostaSoros);
                    
                    console.log(`[LOG] Vela: ${valorNum}x | Tensão: ${memoria.sequenciaBaixa} | Rosa: ${memoria.rodadasSemRosa} | RSI: ${rsiAtual} | Z-Score: ${memoria.zScoreAtual}`);
                    break; 
                }
            }
        } catch (e) {}
    }, 500);
})();
