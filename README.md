# Clinical Management System (CMS) 🏥

نظام متكامل لإدارة العيادات الطبية، يهدف إلى تنظيم العلاقة بين المرضى، الأطباء، والممرضين من خلال منصة رقمية آمنة وفعالة. يتميز النظام بمحرك ذكي لفحص التفاعلات الدوائية ونظام جدولة مواعيد دقيق.

## 🚀 المميزات الرئيسية

* **نظام أدوار متكامل (RBAC):** صلاحيات مخصصة لكل من (المريض، الطبيب، الممرض، والمسؤول).
* **محرك الأمان الدوائي:** فحص تلقائي للتفاعلات بين الأدوية عند كتابة التشخيص لتجنب المخاطر الطبية.
* **جدولة المواعيد:** نظام حجز ذكي يعتمد على فترات زمنية (10 دقائق) مع قواعد خاصة للمرضى الدائمين.
* **إدارة السجلات الطبية:** توثيق كامل للعلامات الحيوية (بواسطة الممرضين) والتشخيصات والوصفات الطبية (بواسطة الأطباء).
* **التنبيهات الفورية:** دمج RabbitMQ لإرسال إشعارات وتنبيهات فورية عند اكتمال التشخيص أو الحجز.
* **حماية متقدمة:** تحديد معدل الطلبات (Rate Limiting) وتأمين البيانات باستخدام JWT و Bcrypt.

## 🛠 التكنولوجيا المستخدمة

### Backend (الخلفية)
* **Framework:** FastAPI (Python)
* **Database:** PostgreSQL (SQLAlchemy ORM)
* **Security:** JWT (OAuth2), Bcrypt for password hashing
* **Task Queue:** RabbitMQ (Pika)
* **Rate Limiting:** SlowAPI (Redis supported)
* **Validation:** Pydantic models

### Frontend (الواجهة الأمامية)
* **Core:** Vanilla JavaScript (ES6+)
* **Styling:** Modern CSS (Custom Properties, Flexbox, Grid)
* **Architecture:** API-based communication with centralized `api.js` service.

## 📂 هيكلة المشروع

```
CMS/
├── backend/
│   ├── app/
│   │   ├── main.py                          # نقطة بداية التطبيق
│   │   ├── api/
│   │   │   ├── dependencies.py              # تبعيات المصادقة والصلاحيات
│   │   │   └── v1/
│   │   │       ├── router.py                # موجه API الرئيسي
│   │   │       └── endpoints/
│   │   │           ├── auth.py              # التسجيل وتسجيل الدخول
│   │   │           ├── appointments.py      # إدارة المواعيد
│   │   │           ├── clinical.py          # التشخيص والعلامات الحيوية
│   │   │           └── portal.py            # بوابات المستخدمين
│   │   ├── core/
│   │   │   ├── config.py                    # إعدادات التطبيق
│   │   │   ├── database.py                  # اتصال قاعدة البيانات
│   │   │   ├── security.py                  # تشفير كلمات المرور و JWT
│   │   │   └── rate_limit.py                # تحديد معدل الطلبات
│   │   ├── models/
│   │   │   ├── __init__.py                  # تصدير جميع النماذج
│   │   │   ├── user.py                      # نموذج المستخدم
│   │   │   ├── doctor.py                    # نموذج الطبيب
│   │   │   ├── nurse.py                     # نموذج الممرض
│   │   │   ├── patient.py                   # نموذج المريض
│   │   │   ├── appointment.py               # نموذج الموعد
│   │   │   ├── availability.py              # نموذج التوفر
│   │   │   ├── vital_signs.py               # نموذج العلامات الحيوية
│   │   │   ├── medical_records.py           # نموذج السجل الطبي
│   │   │   ├── prescriptions.py             # نموذج الوصفة الطبية
│   │   │   ├── drugs.py                     # نموذج الدواء
│   │   │   ├── interactions.py              # نموذج التفاعل الدوائي
│   │   │   ├── specializations.py           # نموذج التخصص
│   │   │   └── notification.py              # نموذج الإشعار
│   │   ├── schemas/
│   │   │   ├── user.py                      # نماذج التحقق للمستخدم
│   │   │   ├── clinical.py                  # نماذج التحقق السريرية
│   │   │   ├── appointment.py               # نماذج التحقق للمواعيد
│   │   │   └── portal.py                    # نماذج التحقق للبوابات
│   │   ├── services/
│   │   │   ├── clinical.py                  # محرك فحص التفاعلات الدوائية
│   │   │   └── scheduler.py                 # محرك جدولة المواعيد
│   │   └── utils/
│   │       ├── id_generator.py              # مولد المعرفات الآمن
│   │       └── rabbitmq.py                  # خدمة الرسائل والإشعارات
│   ├── tests/
│   │   ├── conftest.py                      # إعداد بيئة الاختبار
│   │   ├── test_clinical_service.py         # اختبارات محرك التفاعلات
│   │   ├── test_scheduler.py                # اختبارات الجدولة
│   │   ├── test_security.py                 # اختبارات الأمان
│   │   └── test_auth_api.py                 # اختبارات واجهة المصادقة
│   ├── alembic/                             # ملفات تهجير قاعدة البيانات
│   ├── alembic.ini                          # إعدادات Alembic
│   ├── add_indexes.py                       # سكربت إنشاء الفهارس
│   ├── seed_db.py                           # سكربت ملء قاعدة البيانات
│   ├── requirements.txt                     # قائمة المكتبات المطلوبة
│   └── .env.example                         # مثال لمتغيرات البيئة
└── frontend/
    ├── assets/                              # الصور والأيقونات
    ├── css/                                 # ملفات التنسيق
    ├── js/
    │   ├── api.js                           # طبقة الاتصال بالخلفية
    │   ├── auth.js                          # حارس المصادقة
    │   ├── doctors.js                       # عرض قائمة الأطباء
    │   ├── admin/                           # سكربتات المسؤول
    │   │   ├── dashboard.js                 # لوحة القيادة
    │   │   ├── users.js                     # إدارة المستخدمين
    │   │   ├── users-modal.js               # نوافذ إدارة المستخدمين
    │   │   └── schedules.js                 # إدارة الجداول
    │   ├── doctor/                          # سكربتات الطبيب
    │   │   ├── dashboard.js                 # لوحة القيادة
    │   │   ├── appointments.js              # إدارة المواعيد
    │   │   ├── diagnosis.js                 # التشخيص والوصفات
    │   │   ├── records.js                   # السجلات الطبية
    │   │   └── profile.js                   # الملف الشخصي
    │   ├── nurse/                           # سكربتات الممرض
    │   │   ├── dashboard.js                 # لوحة القيادة
    │   │   ├── vitals.js                    # العلامات الحيوية
    │   │   └── profile.js                   # الملف الشخصي
    │   └── patient/                         # سكربتات المريض
    │       ├── dashboard.js                 # لوحة القيادة
    │       ├── appointments.js              # إدارة المواعيد
    │       ├── records.js                   # السجلات الطبية
    │       └── profile.js                   # الملف الشخصي
    └── pages/
        ├── index.html                       # الصفحة الرئيسية
        ├── login.html                       # تسجيل الدخول
        ├── register.html                    # التسجيل
        ├── doctors.html                     # عرض الأطباء
        ├── about.html                       # حول النظام
        ├── admin/                           # صفحات لوحة المسؤول
        │   ├── dashboard.html
        │   ├── users.html
        │   └── schedules.html
        ├── doctor/                          # صفحات لوحة الطبيب
        │   ├── dashboard.html
        │   ├── appointments.html
        │   ├── diagnosis.html
        │   ├── records.html
        │   └── profile.html
        ├── nurse/                           # صفحات لوحة الممرض
        │   ├── dashboard.html
        │   ├── vitals.html
        │   └── profile.html
        └── patient/                         # صفحات بوابة المريض
            ├── dashboard.html
            ├── appointments.html
            ├── records.html
            └── profile.html
```

## ⚙️ التثبيت والتشغيل

### المتطلبات
* Python 3.11+
* PostgreSQL
* RabbitMQ (اختياري للرسائل)

### خطوات التشغيل
1.  **تحميل المشروع:**
    ```bash
    git clone https://github.com/mnagah2026-dev/Clinical-Management-System.git
    cd CMS
    ```

2.  **إعداد البيئة الافتراضية والتثبيت:**
    ```bash
    python -m venv venv
    source venv/bin/activate  # لنظام Linux/Mac
    venv\Scripts\activate     # لنظام Windows
    cd backend
    pip install -r requirements.txt
    ```

3.  **تكوين قاعدة البيانات (PostgreSQL):**
    قم بتسجيل الدخول إلى خادم PostgreSQL الخاص بك (عبر أداة مثل pgAdmin) وقم بإنشاء قاعدة بيانات فارغة باسم (`cms_db`).

4.  **إعداد المتغيرات البيئية:**
    قم بإنشاء ملف `.env` داخل مجلد `backend` وأضف فيه بيانات قاعدة البيانات لتتطابق مع خادم PostgreSQL:
    ```env
    # Copy this file to .env and fill in your values
    JWT_SECRET_KEY=change-me-to-a-random-string
    JWT_ALGORITHM=HS256
    ACCESS_TOKEN_EXPIRE_MINUTES=60

    POSTGRES_USER=postgres
    POSTGRES_PASSWORD=your-database-password
    POSTGRES_SERVER=localhost
    POSTGRES_PORT=5432
    POSTGRES_DB=cms_db

    REDIS_URL=redis://localhost:6379/
    CORS_ORIGINS=["*"]
    ```

5.  **إعداد الجداول (Database Migrations):**
    نقوم بإنشاء وتحديث جداول قاعدة البيانات باستخدام `Alembic`:
    ```bash
    alembic upgrade head
    ```

6.  **إضافة البيانات التمهيدية والفهارس (Seeding & Indexing):**
    لتسهيل التجربة، تم تجهيز سكربتات تملأ قاعدة البيانات تلقائياً ببيانات افتراضية (أطباء، مرضى، أدوية، إلخ) وتنشئ فهارس تسريع البحث:
    ```bash
    python seed_db.py
    python add_indexes.py
    ```
    *(ملاحظة: تأكد من ضبط مسار ملفات الـ CSV الخاص بك في المتغير `CSV_DIR` للحصول على البيانات)*

7.  **تشغيل الخادم:**
    ```bash
    uvicorn app.main:app --reload
    ```

8.  **الوصول إلى النظام:**
    * **الواجهة الأمامية (Frontend):** بمجرد عمل الخادم، يمكنك الوصول إلى النظام وواجهاته بالتوجه إلى الرابط: `http://127.0.0.1:8000/`.
    * **توثيق الواجهة البرمجية (API Docs):** للاطلاع على الـ Endpoints وتجربتها بشكل تفاعلي، قم بزيارة `http://127.0.0.1:8000/docs`.

## 🧪 الاختبارات
لتشغيل اختبارات الأمان والجدولة والمحرك الطبي:
```bash
cd backend
pytest
```

## 📝 ملاحظات تقنية
* تم استخدام **Thread-safe ID generation** لضمان عدم تكرار المعرفات في بيئات التشغيل المتزامنة.
* واجهة المستخدم تعتمد على نظام **Components** بسيط باستخدام Vanilla JS لضمان السرعة والخفة في التحميل.
