export function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-10 space-y-10">
      <header className="space-y-3 border-b border-[#E2DACB] pb-6">
        <p className="text-xs uppercase tracking-widest text-[#782F35] font-medium">
          Dự án xã hội phi lợi nhuận · Mã A01
        </p>
        <h1 className="font-serif text-3xl sm:text-4xl font-bold text-[#35261C]">
          Giới thiệu dự án Ký Ức Việt
        </h1>
        <p className="text-sm text-[#5C534A] leading-relaxed">
          “Ký Ức Việt – Hồ sơ số di sản tư liệu” là dự án thực tập sinh xã hội
          phi lợi nhuận, không bán hàng, không thu phí và không đặt quảng cáo;
          hướng tới hỗ trợ học tập, tra cứu và nâng cao nhận thức bảo tồn di sản
          tư liệu Việt Nam.
        </p>
      </header>

      <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white border border-[#E2DACB] rounded-lg p-6 space-y-3">
          <h2 className="font-serif text-lg font-bold text-[#35261C]">
            Thông tin thực hiện
          </h2>
          <dl className="text-sm space-y-2 text-[#292524]">
            <div>
              <dt className="text-xs text-[#5C534A]">Sinh viên thực hiện</dt>
              <dd className="font-medium">Trần Mạnh Trường — MSSV: PH59448</dd>
            </div>
            <div>
              <dt className="text-xs text-[#5C534A]">Đơn vị / Nhóm</dt>
              <dd className="font-medium">
                Nhóm 1 · Chương trình Thực tập sinh Đợt 15 (FPT Polytechnic ×
                IMTA TECH)
              </dd>
            </div>
            <div>
              <dt className="text-xs text-[#5C534A]">Mã hồ sơ dự án</dt>
              <dd className="font-medium">A01 (Mốc kế hoạch tuần 4: 05/11/2026)</dd>
            </div>
          </dl>
        </div>

        <div className="bg-white border border-[#E2DACB] rounded-lg p-6 space-y-3">
          <h2 className="font-serif text-lg font-bold text-[#35261C]">
            Phạm vi &amp; Quy ước thống kê
          </h2>
          <ul className="text-sm text-[#292524] space-y-2 leading-relaxed list-disc pl-5">
            <li>
              13 di sản tư liệu Việt Nam được UNESCO ghi danh: 4 di sản Ký ức
              Thế giới và 9 di sản Ký ức khu vực châu Á – Thái Bình Dương.
            </li>
            <li>
              Bổ sung 2 hồ sơ con thuộc bộ Bia Tiến sĩ (A01-00014 và A01-00015,
              liên kết tới A01-00002) để tạo danh mục 15 bản ghi dự kiến; hai bản
              ghi con không được cộng dồn thành 15 di sản UNESCO.
            </li>
          </ul>
        </div>
      </section>

      <section className="bg-white border border-[#E2DACB] rounded-lg p-6 space-y-4">
        <h2 className="font-serif text-xl font-bold text-[#35261C]">
          Phương pháp chuẩn hóa &amp; Minh bạch nguồn
        </h2>
        <div className="text-sm text-[#292524] space-y-3 leading-relaxed">
          <p>
            Mỗi hồ sơ áp dụng 15 trường chuẩn Dublin Core (DCMI — N08) kết hợp
            các trường nghiệp vụ di sản tư liệu (nơi lưu giữ hiện nay, địa danh
            lịch sử, loại bản hiển thị, tình trạng bản gốc, số đăng ký, cấp
            phép, nội dung loại trừ và mức kiểm chứng).
          </p>
          <p>
            Hệ thống tách bạch rõ{' '}
            <strong>năm được UNESCO ghi danh (recognition_year)</strong> với{' '}
            <strong>niên đại tạo lập tư liệu (Date)</strong>; tách bạch trạng
            thái công bố với mức độ kiểm chứng học thuật; tuyệt đối không tự
            tạo số đăng ký, tên người cho phép hay sử dụng ảnh minh họa giả.
          </p>
        </div>
      </section>

      <section className="bg-[#F3EFE6] border border-[#E2DACB] rounded-lg p-6 space-y-4">
        <h2 className="font-serif text-xl font-bold text-[#35261C]">
          Giới hạn hiện tại &amp; Các hạng mục chưa hoàn thành
        </h2>
        <ul className="text-sm text-[#292524] space-y-2.5 leading-relaxed list-disc pl-5">
          <li>
            <strong>Chưa có ảnh/bản số tự chụp được cấp phép:</strong> Toàn bộ 15
            bản ghi hiện đang ở dạng hồ sơ mô tả nghiên cứu thứ cấp (
            <code>Chưa có bản hiển thị</code>), chưa gắn tệp ảnh hiện vật.
          </li>
          <li>
            <strong>Thiếu nguồn đối chiếu thứ hai ở 12/15 hồ sơ:</strong> Chỉ
            các hồ sơ A01-00002, A01-00014, A01-00015 có từ 2 nguồn đối chiếu trở
            lên; 12 hồ sơ còn lại đang gắn nhãn{' '}
            <em>Chờ bổ sung nguồn thứ hai</em>.
          </li>
          <li>
            <strong>Cần xác minh thực địa &amp; đơn vị giữ trực tiếp:</strong>{' '}
            Địa chỉ cấp xã/phường, số đăng ký hiện vật và tình trạng bảo quản
            thực tế đang ghi <em>Chưa xác định</em>.
          </li>
          <li>
            <strong>Xác nhận phương án 15 bản ghi với trưởng nhóm:</strong> Việc
            bổ sung 2 bản ghi con bia Tiến sĩ là phương án triển khai cần trưởng
            nhóm xác nhận đối chiếu yêu cầu khối tư liệu cụ thể; không tự đánh
            giá đạt nghiệm thu chỉ vì đủ 15 hàng dữ liệu.
          </li>
        </ul>
      </section>
    </div>
  );
}
