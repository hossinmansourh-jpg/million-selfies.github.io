const fs = require('fs');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { Octokit } = require('@octokit/rest');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const octokit = new Octokit({ auth: process.env.GITHUB_TOKEN });

const REPO_OWNER = 'hossinmansourh-jpg';
const REPO_NAME = 'million-selfies.github.io';
const BASE_BRANCH = 'main';

async function runAgent() {
  try {
    console.log('🚀 بدء تشغيل الوكيل...');

    const htmlCode = fs.existsSync('index.html') ? fs.readFileSync('index.html', 'utf8') : '';
    const cssCode = fs.existsSync('styles.css') ? fs.readFileSync('styles.css', 'utf8') : '';
    const jsCode = fs.existsSync('app.js') ? fs.readFileSync('app.js', 'utf8') : '';
    const cardCode = fs.existsSync('card.html') ? fs.readFileSync('card.html', 'utf8') : '';
    const hossinCode = fs.existsSync('hossin.html') ? fs.readFileSync('hossin.html', 'utf8') : '';

    const issueTitle = process.env.ISSUE_TITLE || '';
    const issueBody = process.env.ISSUE_BODY || '';
    const issueNumber = process.env.ISSUE_NUMBER || '';

    console.log(`📝 المشكلة: ${issueTitle}`);

    const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash-latest' });

    const prompt = `
أنت مطور ويب خبير تعمل على موقع "جدارية مليون صورة سيلفي" (HTML5, Canvas, CSS3, Vanilla JS).

🎯 المهمة: ${issueTitle}
📄 الوصف: ${issueBody}

📂 الملفات الحالية:

===== index.html =====
${htmlCode}

===== styles.css =====
${cssCode}

===== app.js =====
${jsCode}

===== card.html =====
${cardCode}

===== hossin.html =====
${hossinCode}

✅ المطلوب:
حل المشكلة أو إضافة الميزة المطلوبة.

⚠️ قواعد صارمة:
- أرجع JSON فقط بدون أي نص إضافي
- لا تستخدم \`\`\`json أو أي علامات
- الملفات التي لا تحتاج تعديلاً اجعلها null

الصيغة المطلوبة:
{
  "summary": "ملخص قصير",
  "files": {
    "index.html": "الكود الكامل أو null",
    "styles.css": "الكود الكامل أو null",
    "app.js": "الكود الكامل أو null",
    "card.html": "الكود الكامل أو null",
    "hossin.html": "الكود الكامل أو null"
  }
}
`;

    console.log('🤖 إرسال إلى Gemini...');
    const result = await model.generateContent(prompt);
    const responseText = result.response.text().trim();

    console.log('✅ تم استقبال الرد');

    let jsonText = responseText;
    if (jsonText.startsWith('```')) {
      jsonText = jsonText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    }

    const data = JSON.parse(jsonText);
    const files = data.files || {};

    console.log(`📝 ملخص: ${data.summary || 'بدون ملخص'}`);

    const modifiedFiles = [];
    for (const [filename, content] of Object.entries(files)) {
      if (content && content !== 'null' && content.length > 50) {
        fs.writeFileSync(filename, content, 'utf8');
        modifiedFiles.push(filename);
        console.log(`✏️ تم تعديل: ${filename}`);
      }
    }

    if (modifiedFiles.length === 0) {
      console.log('⚠️ لا توجد تعديلات');
      return;
    }

    const branchName = `ai-fix-issue-${issueNumber}-${Date.now()}`;
    console.log(`🌿 إنشاء فرع: ${branchName}`);

    const { data: refData } = await octokit.git.getRef({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      ref: `heads/${BASE_BRANCH}`
    });

    await octokit.git.createRef({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      ref: `refs/heads/${branchName}`,
      sha: refData.object.sha
    });

    for (const filename of modifiedFiles) {
      const content = fs.readFileSync(filename, 'utf8');
      const encoded = Buffer.from(content).toString('base64');

      let fileSha;
      try {
        const { data } = await octokit.repos.getContent({
          owner: REPO_OWNER,
          repo: REPO_NAME,
          path: filename,
          ref: branchName
        });
        fileSha = data.sha;
      } catch (e) {}

      await octokit.repos.createOrUpdateFileContents({
        owner: REPO_OWNER,
        repo: REPO_NAME,
        path: filename,
        message: `🤖 إصلاح تلقائي: ${filename}`,
        content: encoded,
        branch: branchName,
        ...(fileSha && { sha: fileSha })
      });

      console.log(`✅ تم رفع: ${filename}`);
    }

    const { data: pr } = await octokit.pulls.create({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      title: `🤖 ${issueTitle}`,
      head: branchName,
      base: BASE_BRANCH,
      body: `## 🤖 إصلاح تلقائي\n\n**الملخص:** ${data.summary || 'بدون ملخص'}\n\n**الملفات:**\n${modifiedFiles.map(f => `- \`${f}\``).join('\n')}\n\n---\n\nCloses #${issueNumber}`
    });

    console.log(`🎉 PR: ${pr.html_url}`);

    await octokit.issues.createComment({
      owner: REPO_OWNER,
      repo: REPO_NAME,
      issue_number: parseInt(issueNumber),
      body: `✅ تم إنشاء Pull Request: ${pr.html_url}\n\n**الملفات:**\n${modifiedFiles.map(f => `- \`${f}\``).join('\n')}`
    });

    console.log('🎊 اكتمل!');

  } catch (error) {
    console.error('❌ خطأ:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

runAgent();
