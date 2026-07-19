# TaxLens Product Context

## Register

product

## Users

- Chu ho kinh doanh va doanh nghiep sieu nho dung TaxLens hang ngay de biet giao dich nao da khop, ngoai le nao can xu ly, hoa don nao con thieu va du lieu da san sang cho quy trinh thue hay chua.
- Nhan vien van hanh SHB, Relationship Manager va compliance dung console rieng de theo doi danh muc merchant, xu ly case, kiem tra agent trace va audit evidence.

## Product Purpose

TaxLens la lop ket noi va kiem soat TaxOps do SHB cung cap. San pham hop nhat giao dich ngan hang, don hang, tien mat, COD va hoa don thanh mot ledger co the kiem tra; rules xu ly dieu chac chan, AI giai thich su mo ho, va con nguoi phe duyet quyet dinh quan trong. Thanh cong nghia la merchant chi can xu ly mot so ngoai le ro rang, SHB co day du dau vet van hanh, va du lieu sach co the xuat sang quy trinh ke toan hoac thue hien co.

## Brand Personality

Tin cay, binh tinh, gan gui. TaxLens can cam thay bank-grade va co cau truc ma khong quan lieu; thong minh ma khong dung AI cliche; cao cap ma khong trang tri xa xi.

## Anti-references

- Khong la generic admin template, chatbot chung chung, dashboard day metric khong co hanh dong, hoac giao dien ke toan day thuat ngu.
- Khong gia vo la POS day du, phan mem ke toan, he thong phat hanh hoa don, cong cu nop thue, hay API nop truc tiep sang MISA.
- Khong che giau bang chung, tu dong phe duyet quyet dinh mo ho, hoac hien thi private chain-of-thought.

## Design Principles

1. Exception-first: uu tien dieu can phan doan thay vi bat nguoi dung doc toan bo du lieu tho.
2. Action before analytics: moi man hinh phai lam ro dieu gi da xay ra, vi sao quan trong va buoc tiep theo la gi.
3. Human control remains explicit: goi y AI luon kem do tin cay, evidence va hanh dong phe duyet ro rang.
4. One source of truth: cung mot record phai co cung trang thai tren dashboard, ledger, hoa don, readiness va operations.
5. Progressive disclosure by role: merchant thay ngon ngu Viet don gian; SHB thay trace ky thuat da sanitize va audit evidence day du.

## Accessibility & Inclusion

- Ho tro day du desktop va mobile, dieu huong ban phim, focus visible, semantic labels va contrast it nhat WCAG AA.
- Ton trong `prefers-reduced-motion`; khong dung mau sac lam tin hieu trang thai duy nhat.
- Vietnamese-first, ho tro dau/khong dau va copy de hieu cho merchant khong co chuyen mon ke toan.
