const express = require('express');
const axios = require('axios');
const path = require('path');
const fs = require('fs').promises;
const pdfParse = require('pdf-parse');
const app = express();
const port = 3000;

// Middleware to parse JSON bodies
app.use(express.json());
app.use(express.static(path.join(__dirname, '../')));

// Kimi API configuration
const KIMI_API_KEY = 'YOUR_API_KEY_HERE'; // Replace with your actual Kimi API key
const KIMI_API_URL = 'https://api.moonshot.cn/v1/chat/completions';

// Function to call Kimi API
async function callKimiAPI(prompt) {
  try {
    const response = await axios.post(KIMI_API_URL, {
      model: 'moonshot-v1-8k',
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    }, {
      headers: {
        'Authorization': `Bearer ${KIMI_API_KEY}`,
        'Content-Type': 'application/json'
      }
    });
    return response.data.choices[0].message.content;
  } catch (error) {
    console.error('Error calling Kimi API:', error.response ? error.response.data : error.message);
    throw error;
  }
}

// Language analysis endpoint
app.post('/analyze-language', async (req, res) => {
  try {
    const { abstract } = req.body;
    const prompt = `请详细分析以下学术论文摘要中的语言使用情况，包括：

1. 识别并列出所有复杂、浮夸或不必要的学术术语和行话
2. 分析句子结构中的"权威性修辞"与"包装性语言"
3. 统计修辞密度与逻辑虚空度（句子多但信息少的情况）
4. 区分真正的方法描述与空洞的包装词块
5. 标注可能引起"学术浮夸"的短语

请逐条分析，给出具体例子并解释为什么这些表达是浮夸或不必要的：

${abstract}`;
    const analysis = await callKimiAPI(prompt);
    res.json({ analysis });
  } catch (error) {
    res.status(500).json({ error: 'Failed to analyze language' });
  }
});

// Concept revelation endpoint
app.post('/reveal-concepts', async (req, res) => {
  try {
    const { abstract } = req.body;
    const prompt = `请深入分析以下学术论文摘要中的模型和方法名称，揭示它们背后的实际设计：

1. 识别并列出所有看似高大上的模型或算法名称
2. 对每个名称，分析其实际可能的技术实现（如是否只是简单的组合）
3. 揭示学术化掩饰的本质（例如"Adaptive Dual Synergistic Encoder"可能就是两层MLP）
4. 为每个复杂名称提供"白话翻译"版本
5. 指出哪些是"伪创新"，即名称华丽但实质平庸的设计

请逐条分析，并解释为什么这些名称是过度包装的：

${abstract}`;
    const revelation = await callKimiAPI(prompt);
    res.json({ revelation });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reveal concepts' });
  }
});

// Experiment skepticism endpoint
app.post('/analyze-experiments', async (req, res) => {
  try {
    const { abstract } = req.body;
    const prompt = `请批判性地分析以下学术论文摘要中的实验结果描述：

1. 检测并列出所有夸大性结果陈述（如"significantly outperform"、"achieved state-of-the-art"等）
2. 分析结果描述的可信度与可能的过拟合/选择性呈现
3. 识别可能的数据操纵迹象（如只报告正面结果）
4. 评估实验设置的合理性（如数据集大小、对比方法等）
5. 建立"夸大概率模型"，判断结果陈述的真实性风险
6. 指出实验部分可能存在的问题（如缺乏消融实验、对比不充分等）

请逐条分析，并解释为什么这些结果陈述可能不可信：

${abstract}`;
    const analysis = await callKimiAPI(prompt);
    res.json({ analysis });
  } catch (error) {
    res.status(500).json({ error: 'Failed to analyze experiments' });
  }
});

// Sarcastic rewrite endpoint
app.post('/rewrite-sarcastically', async (req, res) => {
  try {
    const { abstract } = req.body;
    const prompt = `请用不屑的语气重写以下学术论文摘要，指出其中的复杂用词和夸大之处：\n\n${abstract}`;
    const rewrite = await callKimiAPI(prompt);
    res.json({ rewrite });
  } catch (error) {
    res.status(500).json({ error: 'Failed to rewrite abstract' });
  }
});

// Function to extract text from PDF
async function extractTextFromPDF(url) {
  try {
    const response = await axios({
      method: 'get',
      url: url,
      responseType: 'stream'
    });
    
    const data = await pdfParse(response.data);
    return data.text;
  } catch (error) {
    console.error('Error extracting text from PDF:', error);
    throw new Error('Failed to extract text from PDF');
  }
}

// Function to extract abstract from paper text
function extractAbstractFromText(text) {
  // Look for abstract section
  const abstractRegex = /abstract[\s\S]*?(?:\n\n|\n\d|\nintroduction|\n1\.\s*introduction|\nrelated\s*work)/i;
  const match = text.match(abstractRegex);
  
  if (match) {
    // Clean up the abstract text
    let abstract = match[0];
    // Remove the "abstract" heading
    abstract = abstract.replace(/^abstract\s*/i, '');
    // Remove the next section heading
    abstract = abstract.replace(/\n\n.*$/i, '');
    return abstract.trim();
  }
  
  // If no abstract section found, try to get first paragraph
  const firstParagraphRegex = /\n\n([^\n]+\n[^\n]+[^\n]+)\n\n/;
  const firstMatch = text.match(firstParagraphRegex);
  
  if (firstMatch) {
    return firstMatch[1].trim();
  }
  
  // Fallback: return first 500 characters
  return text.substring(0, 500);
}

// Endpoint to add user bias
app.post('/add-bias', async (req, res) => {
  try {
    const { bias } = req.body;
    
    // Read the bias.md file
    const biasFilePath = path.join(__dirname, '../bias.md');
    let biasContent = await fs.readFile(biasFilePath, 'utf8');
    
    // Add the new bias to the "用户偏见" section
    const userBiasSection = '## 用户偏见（用户可在此部分添加自己的偏见）';
    const newBiasEntry = `- ${bias}`;
    
    // Check if the user bias section exists
    if (biasContent.includes(userBiasSection)) {
      // Add the new bias entry
      biasContent = biasContent.replace(userBiasSection, `${userBiasSection}\n${newBiasEntry}`);
    } else {
      // If the section doesn't exist, add it
      biasContent += `\n\n${userBiasSection}\n${newBiasEntry}`;
    }
    
    // Write the updated content back to the file
    await fs.writeFile(biasFilePath, biasContent);
    
    res.json({ success: true, message: 'Bias added successfully' });
  } catch (error) {
    console.error('Error adding bias:', error);
    res.status(500).json({ success: false, error: 'Failed to add bias: ' + error.message });
  }
});

// Go Crazy endpoint
app.post('/go-crazy', async (req, res) => {
  try {
    let { abstract } = req.body;
    
    // Check if input is an arXiv URL
    if (abstract.startsWith('http') && abstract.includes('arxiv.org')) {
      // Extract PDF URL from arXiv URL
      let pdfUrl = abstract;
      if (abstract.includes('/abs/')) {
        pdfUrl = abstract.replace('/abs/', '/pdf/') + '.pdf';
      }
      
      // Extract text from PDF
      const paperText = await extractTextFromPDF(pdfUrl);
      
      // Extract abstract from paper text
      abstract = extractAbstractFromText(paperText);
    }
    
    // 限制摘要长度在1500词以内
    const wordCount = abstract.split(/\s+/).length;
    if (wordCount > 1500) {
      // 如果超过1500词，截取前1500词
      abstract = abstract.split(/\s+/).slice(0, 1500).join(' ');
    }
    
    // Generate crazy rewrite
    const crazyPrompt = `请将以下学术论文摘要以前言不搭后语的方式完全改写，使其看起来像胡言乱语，但要保持一定的可读性：
    
1. 打乱逻辑顺序，让内容看起来毫无关联
2. 随意替换专业术语为不相关的词汇
3. 添加一些看似有道理但实际上毫无意义的句子
4. 保持整体长度在1500词以内
5. 不要完全破坏语法结构，保持一定的可读性
6. 让改写后的内容看起来像是AI失控的产物

原始摘要：
${abstract}`;
    
    const rewrite = await callKimiAPI(crazyPrompt);
    
    res.json({ rewrite });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to go crazy: ' + error.message });
  }
});

// Main endpoint for complete analysis
app.post('/analyze', async (req, res) => {
  try {
    let { abstract, style } = req.body;
    
    // Check if input is an arXiv URL
    if (abstract.startsWith('http') && abstract.includes('arxiv.org')) {
      // Extract PDF URL from arXiv URL
      let pdfUrl = abstract;
      if (abstract.includes('/abs/')) {
        pdfUrl = abstract.replace('/abs/', '/pdf/') + '.pdf';
      }
      
      // Extract text from PDF
      const paperText = await extractTextFromPDF(pdfUrl);
      
      // Extract abstract from paper text
      abstract = extractAbstractFromText(paperText);
    }
    
    // Read bias document
    const biasContent = await fs.readFile(path.join(__dirname, '../bias.md'), 'utf8');
    
    // Run all analyses in parallel
    const [languageAnalysis, conceptRevelation, experimentAnalysis] = await Promise.all([
      callKimiAPI(`请详细分析以下学术论文摘要中的语言使用情况，包括：

1. 识别并列出所有复杂、浮夸或不必要的学术术语和行话
2. 分析句子结构中的"权威性修辞"与"包装性语言"
3. 统计修辞密度与逻辑虚空度（句子多但信息少的情况）
4. 区分真正的方法描述与空洞的包装词块
5. 标注可能引起"学术浮夸"的短语

请逐条分析，给出具体例子并解释为什么这些表达是浮夸或不必要的：

${abstract}`),
      callKimiAPI(`请深入分析以下学术论文摘要中的模型和方法名称，揭示它们背后的实际设计：

1. 识别并列出所有看似高大上的模型或算法名称
2. 对每个名称，分析其实际可能的技术实现（如是否只是简单的组合）
3. 揭示学术化掩饰的本质（例如"Adaptive Dual Synergistic Encoder"可能就是两层MLP）
4. 为每个复杂名称提供"白话翻译"版本
5. 指出哪些是"伪创新"，即名称华丽但实质平庸的设计

请逐条分析，并解释为什么这些名称是过度包装的：

${abstract}`),
      callKimiAPI(`请批判性地分析以下学术论文摘要中的实验结果描述：

1. 检测并列出所有夸大性结果陈述（如"significantly outperform"、"achieved state-of-the-art"等）
2. 分析结果描述的可信度与可能的过拟合/选择性呈现
3. 识别可能的数据操纵迹象（如只报告正面结果）
4. 评估实验设置的合理性（如数据集大小、对比方法等）
5. 建立"夸大概率模型"，判断结果陈述的真实性风险
6. 指出实验部分可能存在的问题（如缺乏消融实验、对比不充分等）

请逐条分析，并解释为什么这些结果陈述可能不可信：

${abstract}`)
    ]);
    
    // Generate sarcastic rewrite based on all analyses
    let styleInstruction = '';
    switch (style) {
      case 'Sarcastic':
        styleInstruction = '请以理性讽刺的冷嘲风格进行评价，使用学术黑话反讽，保持客观但尖锐的语气。';
        break;
      case 'Angry':
        styleInstruction = '请以愤怒的语气进行评价，可以夹杂轻微粗话，表达强烈的不满和不屑。';
        break;
      case 'Weary':
        styleInstruction = '请以厌世学者的疲惫语气进行评价，表达对学术浮夸的疲倦和无奈。';
        break;
      default:
        styleInstruction = '请通过具攻击性的讽刺（甚至带轻微脏话、学术黑话反讽），模仿学界的"犀利评论者"。';
    }
    
    const sarcasticRewritePrompt = `请根据以下分析结果，用尖锐讽刺的语气评价这篇学术论文摘要：
    
语言分析结果：
${languageAnalysis}

概念识破结果：
${conceptRevelation}

实验怀疑结果：
${experimentAnalysis}

${styleInstruction}

请直指：
1. 论文中"包装成新颖"的老想法；
2. "实验奇迹"背后的数据操纵；
3. "模块设计"实则空洞或过拟合。

摘要内容：
${abstract}

此外，请参考以下偏见文档，确保你的批判考虑到这些常见的学术偏见：
${biasContent}`;
    
    const sarcasticRewrite = await callKimiAPI(sarcasticRewritePrompt);
    
    res.json({
      languageAnalysis,
      conceptRevelation,
      experimentAnalysis,
      sarcasticRewrite
    });
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: 'Failed to analyze abstract: ' + error.message });
  }
});

// Serve the main HTML file
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '../disdain.html'));
});

app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});