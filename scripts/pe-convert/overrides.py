"""Hợp đồng S4 viết tay cho 9 bài PE dạng SCRIPT (P01–P09).

VÌ SAO CẦN: Studio chấm bài bằng cặp biểu thức `call`/`expect` chạy trong
namespace của học viên SAU KHI code đã chạy một lần (xem
frontend/public/static/js/studio-lesson.worker.js). Ngân hàng PE cho 9 bài này
lại theo kiểu script: mỗi ca test nạp sẵn biến đầu vào (`name`, `fee`, `scores`…)
rồi chạy lại toàn bộ script. Không có cách nào nạp biến đó qua `call`, nên nếu
giữ nguyên đề thì code khởi tạo sẽ NameError ngay lần chạy đầu.

CÁCH XỬ LÝ: giữ nguyên mục tiêu học, dữ liệu và ngộ nhận của PE, chỉ đổi vỏ
hợp đồng từ "script dùng biến cấp sẵn" sang "hàm nhận tham số". Các ca test lấy
đúng số liệu của public_tests PE, cộng thêm ca biên mà chính hợp đồng PE nêu
(list rỗng, điểm 0, fee đúng 100, không có sentinel).

Mọi thứ khác của bài (S1, S2, S3, gợi ý) vẫn sinh tự động từ ngân hàng.
"""

# call/expect đều là BIỂU THỨC Python chạy trong namespace của học viên.
OVERRIDES = {
    'P01': {
        'task': (
            'Viết hàm greet(name) in đúng một dòng "Xin chao, <name>!" cho tên '
            'được truyền vào. Không hard-code tên, không in thêm lời nhắc. '
            '(Bản PE gốc là script dùng biến name cấp sẵn; ở Studio đề gói lại '
            'thành hàm để chấm được trên trình duyệt.)'
        ),
        'starter': 'def greet(name):\n    """In một dòng chào tên được truyền vào."""\n    # Viết lời giải của bạn ở đây\n',
        'solution': 'def greet(name):\n    """In một dòng chào tên được truyền vào."""\n    print("Xin chao, " + name + "!")\n',
        'tests': [
            {
                'name': 'In đúng tên được truyền vào',
                'source': (
                    'import io, contextlib\n'
                    '_buf = io.StringIO()\n'
                    'with contextlib.redirect_stdout(_buf): greet("An")\n'
                    'assert _buf.getvalue() == "Xin chao, An!\\n", _buf.getvalue()\n'
                ),
            },
            {
                'name': 'Không hard-code: tên khác cho dòng khác',
                'source': (
                    'import io, contextlib\n'
                    '_buf = io.StringIO()\n'
                    'with contextlib.redirect_stdout(_buf): greet("Mai Anh")\n'
                    'assert _buf.getvalue() == "Xin chao, Mai Anh!\\n", _buf.getvalue()\n'
                ),
            },
        ],
    },
    'P02': {
        'task': (
            'Viết hàm total_cost(quantity_text, price): quantity_text là chuỗi số '
            'nguyên không âm, price là int không âm. Trả về tổng tiền dạng int. '
            'Chưa cần xử lý chuỗi không hợp lệ.'
        ),
        'starter': 'def total_cost(quantity_text, price):\n    """Trả về tổng tiền (int) từ số lượng dạng chuỗi."""\n    # Viết lời giải của bạn ở đây\n',
        'solution': 'def total_cost(quantity_text, price):\n    """Trả về tổng tiền (int) từ số lượng dạng chuỗi."""\n    return int(quantity_text) * price\n',
        'tests': [
            {'name': 'Ca mẫu PE: "4" × 15', 'call': 'total_cost("4", 15)', 'expect': '60'},
            {'name': 'Kết quả là số, không phải chuỗi lặp', 'call': 'type(total_cost("3", 2)).__name__', 'expect': '"int"'},
            {'name': 'Số lượng 0', 'call': 'total_cost("0", 15)', 'expect': '0'},
        ],
    },
    'P03': {
        'task': (
            'Viết hàm split_filename(filename): tên tệp luôn có dạng '
            '<name>-<activity>.txt, trong đó name/activity không chứa dấu -. '
            'Trả về list [name, activity]. Tên có thể chứa dấu chấm.'
        ),
        'starter': 'def split_filename(filename):\n    """Trả về [name, activity] tách từ <name>-<activity>.txt."""\n    # Viết lời giải của bạn ở đây\n',
        'solution': 'def split_filename(filename):\n    """Trả về [name, activity] tách từ <name>-<activity>.txt."""\n    return filename.removesuffix(".txt").split("-")\n',
        'tests': [
            {'name': 'Ca mẫu PE: Mai-run.txt', 'call': 'split_filename("Mai-run.txt")', 'expect': '["Mai", "run"]'},
            {'name': 'Không cắt nhầm chữ cuối (bẫy rstrip)', 'call': 'split_filename("An-text.txt")', 'expect': '["An", "text"]'},
            {'name': 'Tên có dấu chấm', 'call': 'split_filename("Mai.A-swim.txt")', 'expect': '["Mai.A", "swim"]'},
        ],
    },
    'P04': {
        'task': (
            'Viết hàm shipping_label(fee): fee là số không âm. Trả về "Free" khi '
            'fee >= 100, ngược lại "Paid". Kiểu trả về là str.'
        ),
        'starter': 'def shipping_label(fee):\n    """Trả về "Free" khi fee >= 100, ngược lại "Paid"."""\n    # Viết lời giải của bạn ở đây\n',
        'solution': 'def shipping_label(fee):\n    """Trả về "Free" khi fee >= 100, ngược lại "Paid"."""\n    if fee >= 100:\n        return "Free"\n    return "Paid"\n',
        'tests': [
            {'name': 'Ca mẫu PE: fee 120', 'call': 'shipping_label(120)', 'expect': '"Free"'},
            {'name': 'Ranh giới: đúng 100 vẫn Free', 'call': 'shipping_label(100)', 'expect': '"Free"'},
            {'name': 'Dưới ngưỡng', 'call': 'shipping_label(99.5)', 'expect': '"Paid"'},
        ],
    },
    'P05': {
        'task': (
            'Viết hàm with_extra(scores, extra): trả về BẢN SAO của scores có '
            'extra ở cuối, giữ nguyên scores kể cả khi rỗng. Không có list lồng nhau.'
        ),
        'starter': 'def with_extra(scores, extra):\n    """Trả về bản sao scores có extra ở cuối; scores giữ nguyên."""\n    # Viết lời giải của bạn ở đây\n',
        'solution': 'def with_extra(scores, extra):\n    """Trả về bản sao scores có extra ở cuối; scores giữ nguyên."""\n    result = scores.copy()\n    result.append(extra)\n    return result\n',
        'tests': [
            {
                'name': 'Ca mẫu PE: thêm 9 nhưng không đổi nguồn',
                'source': (
                    'data = [6, 8]\n'
                    'out = with_extra(data, 9)\n'
                    'assert out == [6, 8, 9], out\n'
                    'assert data == [6, 8], data\n'
                ),
            },
            {
                'name': 'Hai tên không dùng chung một list',
                'source': (
                    'data = [1]\n'
                    'out = with_extra(data, 2)\n'
                    'assert out is not data\n'
                ),
            },
            {'name': 'List rỗng', 'call': 'with_extra([], 5)', 'expect': '[5]'},
        ],
    },
    'P06': {
        'task': (
            'Viết hàm lookup_mark(marks, student_id): marks là dict mã -> điểm, '
            'student_id là str. Trả về điểm nếu có mã, None nếu không. Không thay '
            'marks, không tra theo tên hay vị trí.'
        ),
        'starter': 'def lookup_mark(marks, student_id):\n    """Trả về điểm của mã, hoặc None nếu mã không có."""\n    # Viết lời giải của bạn ở đây\n',
        'solution': 'def lookup_mark(marks, student_id):\n    """Trả về điểm của mã, hoặc None nếu mã không có."""\n    return marks.get(student_id, None)\n',
        'tests': [
            {'name': 'Ca mẫu PE: có mã', 'call': 'lookup_mark({"S01": 8}, "S01")', 'expect': '8'},
            {'name': 'Điểm 0 không phải là thiếu', 'call': 'lookup_mark({"S01": 0}, "S01")', 'expect': '0'},
            {'name': 'Không có mã thì None', 'call': 'lookup_mark({"S01": 8}, "S02")', 'expect': 'None'},
            {
                'name': 'Không thay đổi dict nguồn',
                'source': (
                    'marks = {"S01": 8}\n'
                    'lookup_mark(marks, "S09")\n'
                    'assert marks == {"S01": 8}, marks\n'
                ),
            },
        ],
    },
    'P07': {
        'task': (
            'Viết hàm count_ids(ids): ids là list chuỗi. Trả về tuple '
            '(tổng số lượt, số mã khác nhau). Chấp nhận đầu vào rỗng, không thay ids.'
        ),
        'starter': 'def count_ids(ids):\n    """Trả về (tổng số lượt, số mã khác nhau)."""\n    # Viết lời giải của bạn ở đây\n',
        'solution': 'def count_ids(ids):\n    """Trả về (tổng số lượt, số mã khác nhau)."""\n    return (len(ids), len(set(ids)))\n',
        'tests': [
            {'name': 'Ca mẫu PE: A, A, B', 'call': 'count_ids(["A", "A", "B"])', 'expect': '(3, 2)'},
            {'name': 'Trả về tuple chứ không phải list', 'call': 'type(count_ids(["A"])).__name__', 'expect': '"tuple"'},
            {'name': 'Danh sách rỗng', 'call': 'count_ids([])', 'expect': '(0, 0)'},
        ],
    },
    'P08': {
        'task': (
            'Viết hàm count_big_stocks(stocks): stocks là list số nguyên không âm. '
            'Dùng vòng for đếm số kho có ít nhất 10 món và trả về số đếm. Danh sách '
            'rỗng cho 0. Mục tiêu học công khai là dùng vòng for, nên bài chặn sum().'
        ),
        'starter': 'def count_big_stocks(stocks):\n    """Đếm kho có ít nhất 10 món bằng vòng for."""\n    # Viết lời giải của bạn ở đây\n',
        'solution': 'def count_big_stocks(stocks):\n    """Đếm kho có ít nhất 10 món bằng vòng for."""\n    result = 0\n    for stock in stocks:\n        if stock >= 10:\n            result += 1\n    return result\n',
        'forbid': ['sum('],
        'tests': [
            {'name': 'Ca mẫu PE: 9, 10, 14', 'call': 'count_big_stocks([9, 10, 14])', 'expect': '2'},
            {'name': 'Ranh giới: đúng 10 được tính', 'call': 'count_big_stocks([10])', 'expect': '1'},
            {'name': 'Bộ đếm không bị reset trong vòng lặp', 'call': 'count_big_stocks([10, 11, 12, 13])', 'expect': '4'},
            {'name': 'Danh sách rỗng', 'call': 'count_big_stocks([])', 'expect': '0'},
        ],
    },
    # P15/P20 giữ nguyên hợp đồng PE (đã là class/hàm), chỉ thiếu ca chấm: ca
    # công khai của PE gọi hàm của BỘ CHẤM (student_average, valid_boundary_cases)
    # chứ không gọi code học viên, nên không dùng lại được. Hai bộ ca dưới đây
    # bám đúng tiêu chí chấm mà chính đề PE nêu.
    'P15': {
        'tests': [
            {
                'name': 'Trung bình và trạng thái ban đầu',
                'source': (
                    'a = Student("S01")\n'
                    'assert a.student_id == "S01"\n'
                    'assert a.scores == [], a.scores\n'
                    'assert a.average() is None\n'
                    'a.add_score(6); a.add_score(8)\n'
                    'assert a.average() == 7.0, a.average()\n'
                ),
            },
            {
                'name': 'Mỗi instance có list điểm riêng',
                'source': (
                    'a = Student("S01"); b = Student("S02")\n'
                    'a.add_score(9)\n'
                    'assert b.scores == [], b.scores\n'
                    'assert a.scores is not b.scores\n'
                ),
            },
        ],
    },
    'P20': {
        'tests': [
            {
                'name': 'Bộ case đúng dạng và đúng quy tắc >= 5',
                'source': (
                    'cases = make_cases()\n'
                    'assert all(isinstance(c, tuple) and len(c) == 2 for c in cases), cases\n'
                    'assert all(0 <= s <= 10 for s, _ in cases), cases\n'
                    'assert all((s >= 5) == e for s, e in cases), cases\n'
                ),
            },
            {
                'name': 'Có đủ dưới 5, đúng 5 và trên 5',
                'source': (
                    'cases = make_cases()\n'
                    'assert any(s < 5 for s, _ in cases), cases\n'
                    'assert any(s == 5 for s, _ in cases), cases\n'
                    'assert any(s > 5 for s, _ in cases), cases\n'
                ),
            },
            {
                'name': 'Phân biệt được 3 mutant: > 5, luôn True, luôn False',
                'source': (
                    'cases = make_cases()\n'
                    'mutants = [("> 5", lambda s: s > 5), ("luôn True", lambda s: True),\n'
                    '           ("luôn False", lambda s: False)]\n'
                    'for ten, mutant in mutants:\n'
                    '    assert any(mutant(s) != e for s, e in cases), "không bắt được mutant " + ten\n'
                ),
            },
        ],
    },
    'P09': {
        'task': (
            'Viết hàm sum_before_sentinel(values): values là list số nguyên không '
            'âm, có thể có -1 làm sentinel. Dùng while cộng các giá trị trước -1 '
            'đầu tiên, hoặc toàn bộ nếu không có -1. Trả về int; list rỗng cho 0. '
            'Mục tiêu học công khai là vòng while, nên bài chặn for.'
        ),
        'starter': 'def sum_before_sentinel(values):\n    """Cộng các giá trị trước -1 đầu tiên bằng vòng while."""\n    # Viết lời giải của bạn ở đây\n',
        'solution': 'def sum_before_sentinel(values):\n    """Cộng các giá trị trước -1 đầu tiên bằng vòng while."""\n    i = 0\n    result = 0\n    while i < len(values) and values[i] != -1:\n        result += values[i]\n        i += 1\n    return result\n',
        'forbid': ['for '],
        'tests': [
            {'name': 'Ca mẫu PE: 3, 4, -1, 9', 'call': 'sum_before_sentinel([3, 4, -1, 9])', 'expect': '7'},
            {'name': 'Không có sentinel thì cộng hết', 'call': 'sum_before_sentinel([3, 4, 9])', 'expect': '16'},
            {'name': 'List rỗng không IndexError', 'call': 'sum_before_sentinel([])', 'expect': '0'},
            {'name': 'Sentinel ngay đầu', 'call': 'sum_before_sentinel([-1, 5])', 'expect': '0'},
        ],
    },
}
