const fs = require('fs');
const { GoogleGenerativeAI } = require("@google/generative-ai");

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

async function runAgent() {
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const htmlCode = fs.existsSync('index.html') ? fs.readFileSync('index.html', 'utf8') : '';
  const cssCode = fs.existsSync('styles.css') ? fs.readFileSync('styles.css', 'utf8') : '';
  const jsCode = fs.existsSync('app.js') ? fs.readFileSync('app.js', 'utf8') : '';

  const issueTitle = process.env.ISSUE_TITLE;
  const issueBody = process.env.ISSUE_BODY;

  const prompt = `
أنت مطور برمجيات خبير لـ "جدارية مليون صورة سيلفي" (Vanilla JS, Canvas, HTML5, CSS3).

المهمة المطلوبة:
عنوان المشكلة/الميزة: ${issueTitle}
الوصف: ${issueBody}

الكود الحالي:
--- index.html ---
${htmlCode}

--- styles.css ---
${cssCode}

--- app.js ---
${jsCode}

قم بحل المشكلة أو إضافة الميزة. أرجع إجابتك بصيغة JSON حصراً بالشكل التالي دون أي نص إضافي:
{
  "indexHtml": "الكود الكامل لـ index.html بعد التعديل",
  "stylesCss": "الكود الكامل لـ styles.css بعد التعديل",
  "appJs": "الكود الكامل لـ app.js بعد التعديل"
}
`;

  const result = await model.generateContent(prompt);
  const responseText = result.response.text().replace(/```json|```/g, '').trim();
  
  try {
    const updatedFiles = JSON.parse(responseText);
    
    if(updatedFiles.indexHtml) fs.writeFileSync('index.html', updatedFiles.indexHtml);
    if(updatedFiles.stylesCss) fs.writeFileSync('styles.css', updatedFiles.stylesCss);
    if(updatedFiles.appJs) fs.writeFileSync('app.js', updatedFiles.appJs);

    console.log("تم تعديل الكود بنجاح بواسطة الوكيل الاصطناعي!");
  } catch (error) {
    console.error("خطأ في معالجة استجابة الوكيل:", error);
    process.exit(1);
  }
}

runAgent();
