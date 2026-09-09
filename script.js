// 1. إعدادات Firebase وتأكيد الاتصال
const firebaseConfig = {
    apiKey: "AIzaSyCEMxWCT0siwT2t72CX24N1ajSAwqEk7Fs",
    authDomain: "://firebaseapp.com",
    projectId: "million-selfies",
    storageBucket: "million-selfies.firebasestorage.app",
    messagingSenderId: "1016907817387",
    appId: "1:1016907817387:web:f6e9b2b76dcaecebe4b2ee"
};

// تهيئة Firebase في حال لم يتم تهيئته مسبقاً في ملف الـ HTML
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const db = firebase.firestore();

// 2. متغيرات التحكم بالجدارية والتكبير (Zoom)
const GRID_ROWS = 1000; // الإجمالي الافتراضي لمليون بكسل (1000 سطر × 1000 عمود بمقاس 10 بكسل)
const GRID_COLS = 1000;
let currentZoom = 1; // مستوى التكبير الافتراضي

const gridContainer = document.getElementById('gridContainer'); // تأكد من وجود هذا المعرف في index.html
const btnZoomIn = document.getElementById('btnZoomIn');
const btnZoomOut = document.getElementById('btnZoomOut');

// 3. دالة جلب الصور المقبولة ورسم الجدارية
function initializeLiveGrid() {
    if (!gridContainer) return;

    // إعداد واجهة الـ Grid الأساسية عبر CSS المستدعى ديناميكياً
    gridContainer.style.display = 'grid';
    gridContainer.style.gridTemplateRows = `repeat(${GRID_ROWS}, 10px)`;
    gridContainer.style.gridTemplateColumns = `repeat(${GRID_COLS}, 10px)`;
    gridContainer.style.backgroundColor = '#000000';
    gridContainer.style.transformOrigin = 'top left'; // لضمان تكبير سلس من الزاوية

    // جلب البيانات المعتمدة فقط (Approved) من الفايربيس في الوقت الحقيقي
    db.collection("reservations").where("status", "==", "approved")
    .onSnapshot((querySnapshot) => {
        // تفريغ الجدارية وإعادة بنائها عند حدوث أي تحديث أو قبول صورة جديدة
        gridContainer.innerHTML = "";
        
        // مصفوفة ثنائية الأبعاد لتخزين الأماكن المحجوزة لتسريع عملية الرسم
        const reservedPixels = {};

        querySnapshot.forEach((doc) => {
            const data = doc.data();
            // تخزين الرابط باستخدام مفتاح مدمج من السطر والعمود (مثال: "50_120")
            const key = `${data.row}_${data.col}`;
            reservedPixels[key] = {
                imageUrl: data.imageUrl,
                userName: data.userName || ''
            };
        });

        // رسم المربعات (تحسين الأداء: بناء العناصر في الذاكرة أولاً DocumentFragment)
        const fragment = document.createDocumentFragment();

        for (let r = 1; r <= GRID_ROWS; r++) {
            for (let c = 1; c <= GRID_COLS; c++) {
                const pixel = document.createElement('div');
                pixel.style.width = '10px';
                pixel.style.height = '10px';
                pixel.style.boxSizing = 'border-box';
                pixel.style.border = '0.5px solid #222'; // حدود خفيفة جداً للفصل بين المربعات

                const pixelKey = `${r}_${c}`;

                if (reservedPixels[pixelKey]) {
                    // إذا كان المربع محجوزاً ومقبولاً: نضع الصورة الخلفية
                    pixel.style.backgroundImage = `url('${reservedPixels[pixelKey].imageUrl}')`;
                    pixel.style.backgroundSize = 'cover';
                    pixel.style.backgroundPosition = 'center';
                    pixel.title = `المحجز بواسطة: ${reservedPixels[pixelKey].userName} (سطر: ${r}, عمود: ${c})`;
                    pixel.style.cursor = 'pointer';
                    
                    // حدث عند الضغط على الصورة لرؤيتها بشكل أكبر
                    pixel.addEventListener('click', () => {
                        alert(`✨ سيلفي لـ: ${reservedPixels[pixelKey].userName}\n📍 الإحداثيات: سطر ${r}، عمود ${c}`);
                    });
                } else {
                    // إذا كان المربع فارغاً: نتركه باللون الأسود أو نضع لمسة ذهبية خفيفة عند التمرير فوقه
                    pixel.style.backgroundColor = '#111111';
                    pixel.addEventListener('mouseenter', () => pixel.style.backgroundColor = '#d4af37');
                    pixel.addEventListener('mouseleave', () => pixel.style.backgroundColor = '#111111');
                    
                    // حدث عند الضغط على مربع فارغ للحجز (يمكن ربطه بصفحة الحجز لاحقاً)
                    pixel.addEventListener('click', () => {
                        console.log(`مربع فارغ متاح للحجز: سطر ${r}، عمود ${c}`);
                    });
                }

                fragment.appendChild(pixel);
            }
        }
        gridContainer.appendChild(fragment);
    }, (error) => {
        console.error("خطأ أثناء تحميل الجدارية الحية: ", error);
    });
}

// 4. تفعيل أزرار التحكم العائمة للتكبير والتصغير (Zoom) المتوافقة مع الهواتف
if (btnZoomIn && btnZoomOut && gridContainer) {
    btnZoomIn.addEventListener('click', () => {
        if (currentZoom < 5) { // أقصى حد للتكبير 5 مرات
            currentZoom += 0.25;
            gridContainer.style.transform = `scale(${currentZoom})`;
        }
    });

    btnZoomOut.addEventListener('click', () => {
        if (currentZoom > 0.5) { // أدنى حد للتصغير 0.5
            currentZoom -= 0.25;
            gridContainer.style.transform = `scale(${currentZoom})`;
        }
    });
}

// تشغيل الجدارية بمجرد تحميل الصفحة
document.addEventListener('DOMContentLoaded', initializeLiveGrid);
