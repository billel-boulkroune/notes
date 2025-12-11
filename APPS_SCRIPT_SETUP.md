# 🛠️ إعداد Google Apps Script (مهم جداً!)

لقد واجهنا مشكلة لأن **Google API Key لا يسمح بالكتابة/التعديل** على Google Sheets (يسمح بالقراءة فقط).
لحل هذه المشكلة وجعل لوحة التحكم تعمل 100%، سنستخدم **Google Apps Script** كـ "وسيط" مجاني وآمن.

اتبع هذه الخطوات بدقة (تستغرق دقيقتين فقط):

## 1. فتح محرر السكربت
1. افتح Google Sheet الخاص بك.
2. من القائمة العلوية، اختر **Extensions** (الإضافات) > **Apps Script**.

## 2. نسخ الكود
امسح أي كود موجود في المحرر، وانسخ الكود التالي والصقه مكانه:

```javascript
const SHEET_NAME = 'template-sheet.csv'; // تأكد أن هذا يطابق اسم ورقتك
const SCRIPT_PROP = PropertiesService.getScriptProperties();

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  const lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    const doc = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = doc.getSheetByName(SHEET_NAME);
    
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ 
        'result': 'error', 
        'error': 'Sheet not found: ' + SHEET_NAME 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const action = e.parameter.action;
    
    // 1. Read Data (قراءة البيانات)
    if (action == 'read') {
      const rows = sheet.getDataRange().getValues();
      return ContentService.createTextOutput(JSON.stringify({
        'result': 'success', 
        'values': rows 
      })).setMimeType(ContentService.MimeType.JSON);
    }

    // 2. Add Data (إضافة طالب)
    if (action == 'add') {
      const data = JSON.parse(e.postData.contents);
      sheet.appendRow(data.values[0]);
      return ContentService.createTextOutput(JSON.stringify({ 'result': 'success' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // 3. Update Data (تحديث طالب)
    if (action == 'update') {
      const data = JSON.parse(e.postData.contents);
      const rowIndex = parseInt(e.parameter.rowIndex); // 1-based index
      const rowData = data.values[0];
      
      if (rowIndex > 0) {
        sheet.getRange(rowIndex, 1, 1, rowData.length).setValues([rowData]);
        return ContentService.createTextOutput(JSON.stringify({ 'result': 'success' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    // 4. Delete Data (حذف طالب)
    if (action == 'delete') {
      const rowIndex = parseInt(e.parameter.rowIndex);
      if (rowIndex > 0) {
        sheet.deleteRow(rowIndex);
        return ContentService.createTextOutput(JSON.stringify({ 'result': 'success' }))
          .setMimeType(ContentService.MimeType.JSON);
      }
    }

    return ContentService.createTextOutput(JSON.stringify({ 'result': 'error', 'error': 'Invalid action' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ 'result': 'error', 'error': e }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}
```

## 3. النشر (Deploy)
1. اضغط على زر **Deploy** (نشر) الأزرق في الأعلى > **New deployment**.
2. اضغط على أيقونة الترس بجانب "Select type" واختر **Web app**.
3. املأ البيانات:
   - **Description**: Student Grades API
   - **Execute as**: **Me** (أنا)
   - **Who has access**: **Anyone** (أي شخص) <--- **مهم جداً جداً!**
4. اضغط **Deploy**.
5. سيطلب منك **تصريح الوصول (Authorize access)**:
   - اختر حسابك.
   - ستظهر شاشة "Google hasn’t verified this app" (لأنه تطبيقك الخاص).
   - اضغط **Advanced** (متقدم).
   - اضغط **Go to ... (unsafe)** في الأسفل.
   - اضغط **Allow**.
6. انسخ **Web App URL** (الرابط الطويل).

## 4. وضع الرابط في التطبيق
1. افتح ملف `admin/js/sheets-manager.js`.
2. الصق الرابط مكان `YOUR_WEB_APP_URL`.

🎉 انتهى! الآن سيعمل التطبيق بشكل كامل.
