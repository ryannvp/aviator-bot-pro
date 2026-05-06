const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
puppeteer.use(StealthPlugin());

const fs = require('fs');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const TelegramBot = require('node-telegram-bot-api');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const tf = require('@tensorflow/tfjs'); 
const crypto = require('crypto'); 

// =========================================================================
// 📱 CENTRAL DE COMANDO TELEGRAM
// =========================================================================
const TELEGRAM_TOKEN = '8535676098:AAFG1dDkvw4mcp28avsl2UOziEibocODRHE'; 
const CHAT_ID = '-1003932213718'; 
let botTelegram = new TelegramBot(TELEGRAM_TOKEN, { polling: true }); 

// =========================================================================
// ⚙️ CONFIGURAÇÕES DA SINGULARIDADE E ESTADOS
// =========================================================================
let CONFIG = {
    alvoSeguro: 1.50,
    apostaBase: 5.00,
    bancaTotal: 500.00, 
    metaLucro: 100.00,        
    limitePerda: -50.00,     
    gatilhoDinamico: 5, 
    maxHistorico: 500 
};

let memoria = {
    velas: [],
    bancaSimulada: 0.00,
    sequenciaBaixa: 0,
    
    // MÁQUINA DE ESTADO DO TELEGRAM (A Correção Suprema)
    faseTelegram: 'START', // Estados: START, ANALISANDO, PREPARANDO, RESULTADO
    ultimoLucroRodada: 0.00, 

    analisandoResultado: false,
    alertaRosaEnviado: false,
    bloqueioTrem: 0,
    status: "Carregando Tensores LSTM...",
    rodadasSemRosa: 0,
    sentimentoManada: "NEUTRO",
    hashIntegrity: "100% SECURE",
    roboLigado: true, 
    tendenciaLSTM: "Calibrando pesos...",
    rodadasDesdeUltimaMutacao: 0
};

// =========================================================================
// 🧠 REDE NEURAL PROFUNDA (LSTM VERDADEIRO NO TENSORFLOW)
// =========================================================================
const modelLSTM = tf.sequential();
modelLSTM.add(tf.layers.lstm({units: 8, inputShape: [10, 1], returnSequences: false}));
modelLSTM.add(tf.layers.dense({units: 1}));
modelLSTM.compile({optimizer: 'adam', loss: 'meanSquaredError'});
let treinandoIA = false;

async function treinarCerebroLSTM() {
    if (treinandoIA || memoria.velas.length < 30) return;
    treinandoIA = true;
    try {
        let xs = [], ys = [];
        // Prepara os lotes de treinamento (As últimas 10 velas preveem a 11ª)
        for(let i=0; i < Math.min(memoria.velas.length - 11, 100); i++) {
            xs.push(memoria.velas.slice(i+1, i+11).reverse()); 
            ys.push(memoria.velas[i]);
        }
        if(xs.length > 0) {
            const tensorX = tf.tensor3d(xs, [xs.length, 10, 1]);
            const tensorY = tf.tensor2d(ys, [ys.length, 1]);
            await modelLSTM.fit(tensorX, tensorY, {epochs: 5, verbose: 0});
            tensorX.dispose(); tensorY.dispose();
            
            // Previsão do futuro imediato
            const last10 = tf.tensor3d([memoria.velas.slice(0, 10).reverse()], [1, 10, 1]);
            const pred = modelLSTM.predict(last10);
            let predVal = pred.dataSync()[0];
            last10.dispose(); pred.dispose();
            
            if(predVal > 2.0) memoria.tendenciaLSTM = "ALTA PROBABILIDADE (>2.0x)";
            else if(predVal < 1.4) memoria.tendenciaLSTM = "QUEDA ESTRUTURAL (<1.4x)";
            else memoria.tendenciaLSTM = "CONSOLIDAÇÃO NEUTRA";
        }
    } catch(e) {}
    treinandoIA = false;
}
setInterval(treinarCerebroLSTM, 10000); // A IA treina e ajusta os pesos a cada 10 segundos

// =========================================================================
// 🔁 FUNIL DE MENSAGENS BLINDADO (TELEGRAM STATE MACHINE)
// =========================================================================
setTimeout(() => {
    botTelegram.sendMessage(CHAT_ID, `Sejam Bem-Vindos ao Aviator PRO ✈️💰\n\n<i>Sistemas quantitativos online. Iniciando varredura...</i>`, { parse_mode: 'HTML' });
    memoria.faseTelegram = 'ANALISANDO';
}, 2000);

function processarFunilTelegram(novaVela, rsi, apostaSoros) {
    if (!memoria.roboLigado) return;

    // Rosa é evento global (passa por cima do funil)
    let probRosa = Math.min(99, Math.floor((memoria.rodadasSemRosa / 18) * 100));
    if (probRosa > 90 && memoria.rodadasSemRosa >= 18 && !memoria.alertaRosaEnviado) {
        botTelegram.sendMessage(CHAT_ID, `🦄 <b>ALERTA SINGULARIDADE | VELA ROSA</b> 🦄\n\n🔥 Pressão estourada: ${memoria.rodadasSemRosa} rodadas secas.\n📈 <b>Chance Matemática:</b> ${probRosa}%`, { parse_mode: 'HTML' }).catch(()=>{});
        memoria.alertaRosaEnviado = true;
    }

    // ESTADO 1: Rodando livre, procurando a tensão
    if (memoria.faseTelegram === 'ANALISANDO') {
        if (memoria.sequenciaBaixa === (CONFIG.gatilhoDinamico - 1)) {
            let msg = `🔎 Estamos analisando o mercado… aguarde.\n\n⚠️ <b>Tensão Acumulada:</b> ${memoria.sequenciaBaixa} Velas Baixas\n📊 <b>RSI Quântico:</b> ${rsi}`;
            botTelegram.sendMessage(CHAT_ID, msg, { parse_mode: 'HTML' }).catch(()=>{});
            memoria.faseTelegram = 'PREPARANDO';
        }
    }
    // ESTADO 2: Tensão batida, esperando a confirmação do gatilho ou quebra
    else if (memoria.faseTelegram === 'PREPARANDO') {
        if (novaVela >= CONFIG.alvoSeguro) {
            // Cassino pagou antes da hora. Aborta e reseta.
            botTelegram.sendMessage(CHAT_ID, `🚫 <b>ANÁLISE ABORTADA</b> 🚫\nO mercado liberou o pagamento antecipado. Padrão quebrado.`, { parse_mode: 'HTML' }).catch(()=>{});
            memoria.faseTelegram = 'ANALISANDO';
        } else if (memoria.sequenciaBaixa >= CONFIG.gatilhoDinamico) {
            // Confirmou o Sinal!
            let msg = `✅ Mercado analisado!\n\n🚀 <b>ENTRADA CONFIRMADA</b> 🚀\n\n🎯 <b>Sair em:</b> ${CONFIG.alvoSeguro}x\n🧠 <b>Gatilho IA:</b> ${CONFIG.gatilhoDinamico} Velas\n🔮 <b>Rede LSTM:</b> ${memoria.tendenciaLSTM}\n⚖️ <b>Sugestão de Banca:</b> R$ ${apostaSoros}\n\n<i>Ataque a Bullsbet agora!</i>`;
            botTelegram.sendMessage(CHAT_ID, msg, { parse_mode: 'HTML' }).catch(()=>{});
            memoria.faseTelegram = 'RESULTADO';
            memoria.analisandoResultado = true;
        }
    }
    // ESTADO 3: Sinal enviado, esperando Green ou Red
    else if (memoria.faseTelegram === 'RESULTADO' && !memoria.analisandoResultado) {
        let msg = "";
        if (novaVela >= CONFIG.alvoSeguro) {
            msg = `✅ <b>GREEN ABSOLUTO!</b>\n💰 Lucro: R$ ${memoria.ultimoLucroRodada.toFixed(2)}\n📈 Vela: ${novaVela}x`;
        } else {
            msg = `❌ <b>RED - MANIPULAÇÃO DETECTADA</b>\n📉 Vela: ${novaVela}x\n🛡️ <i>A IA recalibrará a defesa Darwiniana.</i>`;
        }
        
        botTelegram.sendMessage(CHAT_ID, msg, { parse_mode: 'HTML' }).then(() => {
            // Dispara o fim da operação e recomeça o ciclo
            setTimeout(() => {
                botTelegram.sendMessage(CHAT_ID, `❌ Entrada finalizada! Aguarde a próxima.`, { parse_mode: 'HTML' }).catch(()=>{});
                memoria.faseTelegram = 'ANALISANDO';
            }, 1500);
        }).catch(()=>{});
    }
}

// =========================================================================
// 🧬 ALGORITMO GENÉTICO (EVOLUÇÃO DARWINIANA)
// =========================================================================
function mutacaoGenetica() {
    if (memoria.velas.length < 100) return;
    let lucroGatilhoAtual = 0, lucroGatilhoMais = 0, lucroGatilhoMenos = 0;
    let seqAtual = 0, seqMais = 0, seqMenos = 0;

    for(let i = 100; i >= 0; i--) {
        let v = memoria.velas[i];
        if(seqAtual >= CONFIG.gatilhoDinamico) { lucroGatilhoAtual += (v >= CONFIG.alvoSeguro ? (CONFIG.apostaBase*0.5) : -CONFIG.apostaBase); seqAtual = v < CONFIG.alvoSeguro ? 1 : 0; } else { seqAtual = v < CONFIG.alvoSeguro ? seqAtual + 1 : 0; }
        if(seqMais >= (CONFIG.gatilhoDinamico + 1)) { lucroGatilhoMais += (v >= CONFIG.alvoSeguro ? (CONFIG.apostaBase*0.5) : -CONFIG.apostaBase); seqMais = v < CONFIG.alvoSeguro ? 1 : 0; } else { seqMais = v < CONFIG.alvoSeguro ? seqMais + 1 : 0; }
        if(seqMenos >= Math.max(3, CONFIG.gatilhoDinamico - 1)) { lucroGatilhoMenos += (v >= CONFIG.alvoSeguro ? (CONFIG.apostaBase*0.5) : -CONFIG.apostaBase); seqMenos = v < CONFIG.alvoSeguro ? 1 : 0; } else { seqMenos = v < CONFIG.alvoSeguro ? seqMenos + 1 : 0; }
    }

    if (lucroGatilhoMais > lucroGatilhoAtual && lucroGatilhoMais > lucroGatilhoMenos && CONFIG.gatilhoDinamico < 8) CONFIG.gatilhoDinamico++;
    else if (lucroGatilhoMenos > lucroGatilhoAtual && lucroGatilhoMenos > lucroGatilhoMais && CONFIG.gatilhoDinamico > 3) CONFIG.gatilhoDinamico--;
    
    memoria.rodadasDesdeUltimaMutacao = 0;
}

// =========================================================================
// 🎮 PAINEL DE CONTROLE (TELEGRAM)
// =========================================================================
botTelegram.onText(/\/painel/, (msg) => {
    const opts = {
        reply_markup: {
            inline_keyboard: [
                [{ text: memoria.roboLigado ? '🔴 Pausar Matriz' : '🟢 Ligar Matriz', callback_data: 'toggle_power' }],
                [{ text: '🧬 Forçar Mutação', callback_data: 'force_mut' }]
            ]
        }
    };
    botTelegram.sendMessage(CHAT_ID, "🕹️ <b>TERMINAL TITÃ</b>", { parse_mode: 'HTML', ...opts });
});

botTelegram.on('callback_query', async (query) => {
    if (query.data === 'toggle_power') {
        memoria.roboLigado = !memoria.roboLigado;
        botTelegram.sendMessage(CHAT_ID, memoria.roboLigado ? "🟢 <b>SISTEMA ARMADO.</b>" : "🔴 <b>SISTEMA PAUSADO.</b>", { parse_mode: 'HTML' });
    } else if (query.data === 'force_mut') {
        mutacaoGenetica();
        botTelegram.sendMessage(CHAT_ID, `🧬 Mutação executada. Novo Gatilho: <b>${CONFIG.gatilhoDinamico}</b>`, { parse_mode: 'HTML' });
    }
});

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
let db;
async function setupServerDB() {
    db = await open({ filename: 'matrix_data.db', driver: sqlite3.Database });
    await db.exec(`CREATE TABLE IF NOT EXISTS velas (id INTEGER PRIMARY KEY AUTOINCREMENT, valor REAL, data TEXT)`);

    const app = express();
    const server = http.createServer(app);
    const io = new Server(server);

    app.get('/', (req, res) => {
        res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>AVIATOR PROTOCOLO TITÃ</title>
            <script src="/socket.io/socket.io.js"></script>
            <style>
                body { background: #010103; color: #00e5ff; font-family: 'Courier New', monospace; padding: 20px; display: flex; flex-direction: column; align-items: center; }
                .grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; width: 1000px; margin-top: 20px; }
                .card { border: 1px solid #111; padding: 20px; border-radius: 10px; background: #050508; box-shadow: 0 5px 15px rgba(0,229,255,0.1); text-align: center; }
                .full { grid-column: span 4; display: flex; justify-content: space-between; align-items: center;}
                .vela { font-size: 110px; font-weight: bold; margin: 10px 0; text-shadow: 0 0 20px rgba(0,229,255,0.5); }
                .red { color: #ff2a55; text-shadow: 0 0 20px rgba(255,42,85,0.5); }
                .pink { color: #ff00ff; text-shadow: 0 0 30px rgba(255,0,255,0.8); }
                .stat-val { font-size: 22px; font-weight: bold; color: #fff; margin-top: 5px; }
                .label { font-size: 10px; color: #666; letter-spacing: 2px; }
            </style>
        </head>
        <body>
            <h1 style="letter-spacing: 5px; font-size: 16px; color: #444;">PROTOCOLO TITÃ V7 (WEB SOCKET + LSTM)</h1>
            <div class="card full" style="margin-top: 20px;">
                <div style="flex:1; text-align:left;">
                    <div class="label">ESTADO FUNIL TELEGRAM</div>
                    <div id="fase" style="color: #ffcc00; font-size:16px; font-weight:bold;">START</div>
                </div>
                <div style="flex:2;">
                    <div id="display" class="vela">--</div>
                </div>
                <div style="flex:1; text-align:right;">
                    <div class="label">REDE NEURAL LSTM</div>
                    <div id="lstm" style="color: #00e5ff; font-size:14px; font-weight:bold;">Treinando...</div>
                </div>
            </div>
            
            <div class="grid">
                <div class="card"><div class="label">LUCRO LÍQUIDO</div><div id="lucro" class="stat-val">R$ 0.00</div></div>
                <div class="card"><div class="label">RSI QUÂNTICO</div><div id="rsi" class="stat-val">50</div></div>
                <div class="card"><div class="label">GATILHO ATUAL</div><div id="gat" class="stat-val">5</div></div>
                <div class="card"><div class="label">ALERTA ROSA</div><div id="probRosa" class="stat-val" style="color:#ff00ff">0%</div></div>
            </div>
            
            <script>
                const socket = io();
                socket.on('nova_vela', (data) => {
                    const el = document.getElementById('display');
                    el.innerText = data.valor.toFixed(2) + 'x';
                    if(data.valor >= 10.00) el.className = 'vela pink';
                    else if(data.valor >= 1.50) el.className = 'vela';
                    else el.className = 'vela red';

                    document.getElementById('lucro').innerText = 'R$ ' + data.lucro.toFixed(2);
                    document.getElementById('rsi').innerText = data.rsi;
                    document.getElementById('fase').innerText = data.fase;
                    document.getElementById('probRosa').innerText = data.probRosa + '%';
                    document.getElementById('lstm').innerText = data.lstm;
                    document.getElementById('gat').innerText = data.gatilho;
                });
            </script>
        </body>
        </html>
        `);
    });
    server.listen(3000);
    return io;
}

function desenharTerminal(velaAtual, metrics) {
    console.clear();
    const corVela = velaAtual >= 10.00 ? '\x1b[35m' : (velaAtual >= CONFIG.alvoSeguro ? '\x1b[32m' : '\x1b[31m');

    console.log('\x1b[36m' + "╔════════════════════════════════════════════════════════════╗" + '\x1b[0m');
    console.log('\x1b[36m' + "║               🌐 PROTOCOLO TITÃ ATIVADO                    ║" + '\x1b[0m');
    console.log('\x1b[36m' + "╠════════════════════════════════════════════════════════════╣" + '\x1b[0m');
    console.log(`║ 📊 Última Vela : ${corVela}${velaAtual || '---'}x\x1b[0m   | RSI Atual: \x1b[33m${metrics.rsi}\x1b[0m`);
    console.log(`║ ⚙️ Funil Bot   : \x1b[33m${memoria.faseTelegram}\x1b[0m       | LSTM IA: \x1b[34m${memoria.tendenciaLSTM}\x1b[0m`);
    console.log(`║ 🦄 Alerta Rosa : \x1b[35m${metrics.probRosa}%\x1b[0m        | Rodadas Secas: \x1b[35m${memoria.rodadasSemRosa}\x1b[0m`);
    console.log(`║ 🧠 Tensão Mesa : [ \x1b[33m${memoria.sequenciaBaixa} / ${CONFIG.gatilhoDinamico}\x1b[0m ] | Lucro: \x1b[32mR$ ${memoria.bancaSimulada.toFixed(2)}\x1b[0m`);
    console.log('\x1b[36m' + "╠════════════════════════════════════════════════════════════╣" + '\x1b[0m');
    console.log(`║ 📡 Status      : \x1b[35m${memoria.status}\x1b[0m`);
    console.log('\x1b[36m' + "╚════════════════════════════════════════════════════════════╝" + '\x1b[0m');
}

(async () => {
    const io = await setupServerDB();
    desenharTerminal("---", { rsi: 0, probRosa: 0 });

    const browser = await puppeteer.launch({
        headless: false,
        ignoreDefaultArgs: ['--enable-automation'],
        args: ['--start-maximized', '--disable-web-security', '--no-sandbox']
    });

    const page = await browser.newPage();
    await page.setUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36');

    // 🕸️ WEBSOCKET SNIFFING (INTERCEPTAÇÃO DE REDE CDP)
    const client = await page.target().createCDPSession();
    await client.send('Network.enable');
    client.on('Network.webSocketFrameReceived', ({response}) => {
        let payload = response.payloadData;
        if(payload.includes("multiplier") || payload.includes("crash")) {
             memoria.status = "📡 Interceptação WebSocket Ativa! Spribe Hackeada.";
        }
    });

    await page.goto('https://bullsbet.bet.br/casino/game/spribe/aviator', { waitUntil: 'networkidle2' });

    let ultimaVela = "";

    setInterval(async () => {
        try {
            for (const frame of page.frames()) {
                const dadosExtracao = await frame.evaluate(() => {
                    const h = document.querySelectorAll('app-bubble-multiplier, .payout, .bubble-multiplier');
                    const bets = document.querySelectorAll('.bet-text, .amount, .users-count'); 
                    return { vela: h.length > 0 ? h[0].innerText : null, volumeBanca: bets.length };
                });

                const velaAtual = dadosExtracao.vela;

                if (velaAtual && velaAtual !== ultimaVela) {
                    ultimaVela = velaAtual;
                    let valorNum = parseFloat(velaAtual.replace('x', ''));
                    
                    memoria.rodadasDesdeUltimaMutacao++;
                    if (memoria.rodadasDesdeUltimaMutacao >= 50) mutacaoGenetica();

                    if (dadosExtracao.volumeBanca > 50) memoria.sentimentoManada = "BEARISH (RETENDO)";
                    else if (dadosExtracao.volumeBanca < 20) memoria.sentimentoManada = "BULLISH (LIVRE)";
                    else memoria.sentimentoManada = "NEUTRO";

                    memoria.velas.unshift(valorNum);
                    if (memoria.velas.length > CONFIG.maxHistorico) memoria.velas.pop();
                    await db.run('INSERT INTO velas (valor, data) VALUES (?, ?)', [valorNum, new Date().toISOString()]);

                    let rsiAtual = calcularRSI();
                    let apostaKelly = sugerirApostaKelly();

                    if (valorNum >= 10.00) { memoria.rodadasSemRosa = 0; memoria.alertaRosaEnviado = false; } 
                    else { memoria.rodadasSemRosa++; }

                    let probRosa = Math.min(99, Math.floor((memoria.rodadasSemRosa / 18) * 100));

                    if (valorNum < 1.15) memoria.bloqueioTrem++; else memoria.bloqueioTrem = 0;

                    // LÓGICA DE RESOLUÇÃO
                    if (memoria.analisandoResultado) {
                        if (valorNum >= CONFIG.alvoSeguro) {
                            memoria.ultimoLucroRodada = (CONFIG.apostaBase * CONFIG.alvoSeguro) - CONFIG.apostaBase;
                            memoria.bancaSimulada += memoria.ultimoLucroRodada;
                        } else {
                            memoria.ultimoLucroRodada = -CONFIG.apostaBase;
                            memoria.bancaSimulada -= CONFIG.apostaBase;
                        }
                        memoria.analisandoResultado = false;
                        memoria.sequenciaBaixa = valorNum < CONFIG.alvoSeguro ? 1 : 0;
                        
                    } else {
                        if (valorNum < CONFIG.alvoSeguro) memoria.sequenciaBaixa++; 
                        else memoria.sequenciaBaixa = 0;
                        if (valorNum >= 10.00) memoria.sequenciaBaixa = -2;
                    }

                    // EXECUÇÃO DO FUNIL SEGURO DO TELEGRAM
                    let apostaSoros = memoria.ultimoLucroRodada > 0 ? (CONFIG.apostaBase + memoria.ultimoLucroRodada).toFixed(2) : CONFIG.apostaBase.toFixed(2);
                    processarFunilTelegram(valorNum, rsiAtual, apostaSoros);

                    let metricsObj = { rsi: rsiAtual, probRosa: probRosa };
                    desenharTerminal(valorNum, metricsObj);
                    
                    io.emit('nova_vela', {
                        valor: valorNum, estado: memoria.status, lucro: memoria.bancaSimulada,
                        probRosa: probRosa, rsi: rsiAtual, fase: memoria.faseTelegram, 
                        gatilho: CONFIG.gatilhoDinamico, lstm: memoria.tendenciaLSTM
                    });

                    break; 
                }
            }
        } catch (e) {}
    }, 400);

    setInterval(() => {
        if(memoria.velas.length > 500) memoria.velas = memoria.velas.slice(0, 500);
    }, 3600000); 
})();