# REA REVERSE ENGINEERING INVESTIGATION — ITERATION 220
**Document ID:** `REA_INVESTIGATION_ITER_220_SUPER_QR`  
**Investigator:** Worker 1 (Gibbs) — Principal REA Reverse Engineering Investigator  
**Thread ID:** `01a19154-99ab-72a0-9e23-2611b9ffc74c`  
**Milestone:** `REA-ITER-220`  
**Target Reference Binary:** `D:\Claude\TallyKhata\New folder\TallyKhata-Demo.apk` (`REF-001`)  
**SHA-256 Digest:** `267b310e460a538d2dda3e969aaae0c765a72231d6aa65cd0e902297bcaf28b9`  
**Binary Size:** 53,969,511 bytes  
**Date of Audit:** 2026-11-03  

---

## 1. Executive Summary & Investigation Scope

Iteration 220 executes an exhaustive reverse-engineering investigation into the Super QR and Bangla QR payment ecosystem of the authorized reference application (`REF-001`).

Under Bangladesh Bank's National Payment Switch and interoperable digital commerce framework, the **Bangla QR** standard establishes a single, universal QR code through which merchants can receive digital payments from any MFS provider (bKash, Nagad, Rocket, Upay) or licensed commercial bank app (City Touch, EBL Skybanking, Islami Bank Cellfin, etc.).

This investigation delivers concrete bytecode, resource, and manifest evidence covering:
1. **Activity & Architecture Declarations in `AndroidManifest.xml`:**
   - `com.progoti.tallykhata.v2._clean_arch.super_qr.presentation.SuperQRActivity` (Single-merchant QR hub, dynamic amount embedding, transaction limits, and download/share actions).
   - `com.progoti.tallykhata.v2.tallypay.activities.qrScanner.BanglaQrCaptureActivity` (ZXing-based camera QR code capture and decoder).
2. **Core Domain Entities & DTOs in `classes4.dex`:**
   - `com.progoti.tallykhata.v2._clean_arch.scan_and_pay.domain.model.BanglaQrPayment` (`amount`, `newBalance`, `transactionId`, `txnTime`).
   - `com.progoti.tallykhata.v2.tallypay.nobopayDataModel.dto.transaction.BanglaQrPaymentDto` (`acquirerId`, `amount`, `counterId`, `credential`, `externalBinNo`, `merchantCategoryCode`, `merchantCity`, `note`, `outletId`, `requestId`, `toAccount`, `toAccountName`).
   - `com.progoti.tallykhata.v2._clean_arch.scan_and_pay.data.dto.BanglaQrResponseDto` (`amount`, `balanceFrom`, `balanceTo`, `canReverse`, `counterId`, `fee`, `fromName`, `fromWallet`, `invoiceNo`, `outletId`, `reversedTxn`, `toWallet`, `transactionNumber`, `txnTime`, `txnType`, `typeName`).
3. **Jetpack Compose Screens & UI Flow:**
   - `SuperQRScreenKt$SuperQrScreen$1$1`: Primary merchant QR screen with dynamic QR generation, amount input, and merchant credentials.
   - `SuperQRSuccessScreenKt$SuperQRSuccessScreen$1$1`: Dedicated payment received confirmation screen with audio prompt ("টাকা পেয়েছেন") and vibration.
4. **EMVCo Merchant-Presented QR Specifications (Bangladesh Bank Bangla QR Standard):**
   - Tag `00` (Payload Format Indicator, `01`).
   - Tag `01` (Point of Initiation Method, `11` = Static QR, `12` = Dynamic QR with amount).
   - Tag `26` (Merchant Account Information with sub-tags: Tag `00` GUID `A000000677010111`, Tag `01` Merchant PAN/Mobile, Tag `02` Acquirer ID `TALLYPAY`).
   - Tag `52` (Merchant Category Code, e.g. `5411` Grocery/Retail).
   - Tag `53` (Transaction Currency, `050` BDT).
   - Tag `54` (Transaction Amount, formatted with 2 decimal places).
   - Tag `58` (Country Code, `BD`).
   - Tag `59` (Merchant Name).
   - Tag `60` (Merchant City, `Dhaka`).
   - Tag `62` (Additional Data Field Template, Bill/Invoice and Reference Number).
   - Tag `63` (CRC16-CCITT Checksum, polynomial `0x1021`, initial `0xFFFF`).
5. **Authentic Bengali Resource Tokens in `resources.arsc`:**
   - `"বাংলা QR কোড"`, `"বাংলা QR পেমেন্ট"`, `"সব বাংলা QR অ্যাপ"`, `"QR কোড নিন, ব্যবসা বাড়ান"`, `"QR কোড দিয়ে এক কোডেই পেমেন্ট নিন বিকাশ, রকেট ও সকল ব্যাংক অ্যাপ থেকে।"`, `"QR ডাউনলোড সফল হয়েছে।"`, `"QR কোড পিডিএফ-টি আপনার মোবাইলের ডাউনলোড ফোল্ডারে সেভ করা হবে।"`, `"পেমেন্ট সফল হয়েছে।"`.

---

## 2. Technical Invariants & Verification Matrix

| Component | Reference Artifact / Symbol | Verified Evidence |
| :--- | :--- | :--- |
| **Merchant Activity** | `SuperQRActivity` | Registered in `AndroidManifest.xml`, Jetpack Compose runtime |
| **Scanner Activity** | `BanglaQrCaptureActivity` | Registered in `AndroidManifest.xml`, `DecoratedBarcodeView` |
| **Payment DTO** | `BanglaQrPaymentDto` | `classes4.dex` with 12 fields (BigDecimal amount, acquirerId, etc.) |
| **Response DTO** | `BanglaQrResponseDto` | `classes4.dex` with 16 transaction verification fields |
| **Payment Model** | `BanglaQrPayment` | `classes4.dex` domain model with exact balance & transaction IDs |
| **QR Code Standard** | EMVCo TLV + CRC16-CCITT | Tag 00-63 Bangladesh Bank specifications with 0x1021 polynomial |
| **Sound & Haptics** | SQR Audio & Vibrator | Triggered on `SuperQRSuccessScreen` upon payment confirmation |
