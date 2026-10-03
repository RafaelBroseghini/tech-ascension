import type { IdeFile } from "./idePacks.ts"

/** LeetCode-style and classroom problems by career band (see pack ids in idePacks.ts). */
export const PROBLEM_POOLS: Readonly<Record<string, readonly IdeFile[]>> = {
  fizzbuzz: [
    {
      path: "hello.py",
      lang: "python",
      code: `# scratch before turning in lab 1
my_name = "me"  # TODO spell check??

def hello():
    print("starting hello")  # dad says print debug
    msg = "Hello, world!"
    print(msg)
    return msg`,
    },
    {
      path: "gradebook_cli.py",
      lang: "python",
      code: `def run_app() -> bool:
    return True`,
    },
    {
      path: "fizzbuzz.py",
      lang: "python",
      code: `for i in range(1, 101):
    if i % 15 == 0: print("FizzBuzz")
    elif i % 3 == 0: print("Fizz")
    elif i % 5 == 0: print("Buzz")
    else: print(i)`,
    },
    {
      path: "sum_1_to_n.py",
      lang: "python",
      code: `def sum_to(n):
    total = 0
    for i in range(1, n + 1):
        total += i
    return total`,
    },
    {
      path: "count_vowels.py",
      lang: "python",
      code: `def vowels(s):
    n = 0
    for c in s.lower():
        if c in "aeiou":
            n += 1
    return n`,
    },
    {
      path: "reverse_string.py",
      lang: "python",
      code: `def reverse(s):
    out = []
    for i in range(len(s) - 1, -1, -1):
        out.append(s[i])
    return "".join(out)`,
    },
    {
      path: "is_palindrome.py",
      lang: "python",
      code: `def is_palindrome(s):
    t = "".join(c.lower() for c in s if c.isalnum())
    return t == t[::-1]`,
    },
    {
      path: "factorial.py",
      lang: "python",
      code: `def fact(n):
    if n < 2:
        return 1
    return n * fact(n - 1)`,
    },
    {
      path: "fibonacci.py",
      lang: "python",
      code: `def fib(n):
    a, b = 0, 1
    for _ in range(n):
        a, b = b, a + b
    return a`,
    },
    {
      path: "find_max.py",
      lang: "python",
      code: `def find_max(nums):
    best = nums[0]
    for n in nums[1:]:
        if n > best:
            best = n
    return best`,
    },
    {
      path: "linear_search.py",
      lang: "python",
      code: `def index_of(nums, x):
    for i, n in enumerate(nums):
        if n == x:
            return i
    return -1`,
    },
    {
      path: "bubble_sort.py",
      lang: "python",
      code: `def bubble(a):
    a = a[:]
    for i in range(len(a)):
        for j in range(len(a) - 1 - i):
            if a[j] > a[j + 1]:
                a[j], a[j + 1] = a[j + 1], a[j]
    return a`,
    },
    {
      path: "gcd.py",
      lang: "python",
      code: `def gcd(a, b):
    while b:
        a, b = b, a % b
    return a`,
    },
    {
      path: "is_prime.py",
      lang: "python",
      code: `def is_prime(n):
    if n < 2:
        return False
    for d in range(2, int(n ** 0.5) + 1):
        if n % d == 0:
            return False
    return True`,
    },
    {
      path: "two_sum_brute.py",
      lang: "python",
      code: `def two_sum(nums, target):
    for i in range(len(nums)):
        for j in range(i + 1, len(nums)):
            if nums[i] + nums[j] == target:
                return [i, j]`,
    },
    {
      path: "merge_sorted_arrays.py",
      lang: "python",
      code: `def merge(a, b):
    i = j = 0
    out = []
    while i < len(a) and j < len(b):
        if a[i] <= b[j]:
            out.append(a[i]); i += 1
        else:
            out.append(b[j]); j += 1
    return out + a[i:] + b[j:]`,
    },
    {
      path: "rotate_left.py",
      lang: "python",
      code: `def rotate(nums, k):
    k %= len(nums)
    return nums[k:] + nums[:k]`,
    },
    {
      path: "missing_number.py",
      lang: "python",
      code: `def missing(nums):
    n = len(nums)
    want = n * (n + 1) // 2
    return want - sum(nums)`,
    },
    {
      path: "single_digit_sum.py",
      lang: "python",
      code: `def digital_root(n):
    while n >= 10:
        n = sum(int(d) for d in str(n))
    return n`,
    },
    {
      path: "caesar_cipher.py",
      lang: "python",
      code: `def shift(s, k):
    out = []
    for c in s:
        if c.isalpha():
            base = ord("A") if c.isupper() else ord("a")
            out.append(chr((ord(c) - base + k) % 26 + base))
        else:
            out.append(c)
    return "".join(out)`,
    },
    {
      path: "matrix_trace.py",
      lang: "python",
      code: `def trace(m):
    return sum(m[i][i] for i in range(len(m)))`,
    },
  ],
  two_sum: [
    {
      path: "two_sum.py",
      lang: "python",
      code: `def two_sum(nums, target):
    seen = {}
    for i, n in enumerate(nums):
        if target - n in seen:
            return [seen[target - n], i]
        seen[n] = i`,
    },
    { path: "course_registry.py", lang: "python", code: "def run_app() -> bool:\n    return True" },
    {
      path: "valid_anagram.py",
      lang: "python",
      code: `def is_anagram(s, t):
    if len(s) != len(t):
        return False
    count = {}
    for c in s:
        count[c] = count.get(c, 0) + 1
    for c in t:
        count[c] = count.get(c, 0) - 1
        if count[c] < 0:
            return False
    return True`,
    },
    {
      path: "contains_duplicate.py",
      lang: "python",
      code: `def contains_duplicate(nums):
    seen = set()
    for n in nums:
        if n in seen:
            return True
        seen.add(n)
    return False`,
    },
    {
      path: "valid_palindrome.py",
      lang: "python",
      code: `def is_palindrome(s):
    t = "".join(c.lower() for c in s if c.isalnum())
    return t == t[::-1]`,
    },
    {
      path: "best_time_stock.py",
      lang: "python",
      code: `def max_profit(prices):
    best = 0
    low = prices[0]
    for p in prices[1:]:
        best = max(best, p - low)
        low = min(low, p)
    return best`,
    },
    {
      path: "merge_sorted_array.py",
      lang: "python",
      code: `def merge(nums1, m, nums2, n):
    i, j, k = m - 1, n - 1, m + n - 1
    while j >= 0:
        if i >= 0 and nums1[i] > nums2[j]:
            nums1[k] = nums1[i]; i -= 1
        else:
            nums1[k] = nums2[j]; j -= 1
        k -= 1`,
    },
    {
      path: "move_zeroes.py",
      lang: "python",
      code: `def move_zeroes(nums):
    w = 0
    for n in nums:
        if n != 0:
            nums[w] = n
            w += 1
    for i in range(w, len(nums)):
        nums[i] = 0`,
    },
    {
      path: "plus_one.py",
      lang: "python",
      code: `def plus_one(digits):
    for i in range(len(digits) - 1, -1, -1):
        if digits[i] != 9:
            digits[i] += 1
            return digits
        digits[i] = 0
    return [1] + digits`,
    },
    {
      path: "single_number.py",
      lang: "python",
      code: `def single_number(nums):
    x = 0
    for n in nums:
        x ^= n
    return x`,
    },
    {
      path: "intersection_arrays.py",
      lang: "python",
      code: `def intersect(a, b):
    count = {}
    for n in a:
        count[n] = count.get(n, 0) + 1
    out = []
    for n in b:
        if count.get(n, 0) > 0:
            out.append(n)
            count[n] -= 1
    return out`,
    },
    {
      path: "climb_stairs.py",
      lang: "python",
      code: `def climb_stairs(n):
    if n < 3:
        return n
    a, b = 1, 2
    for _ in range(3, n + 1):
        a, b = b, a + b
    return b`,
    },
    {
      path: "remove_duplicates.py",
      lang: "python",
      code: `def remove_duplicates(nums):
    if not nums:
        return 0
    w = 1
    for i in range(1, len(nums)):
        if nums[i] != nums[w - 1]:
            nums[w] = nums[i]
            w += 1
    return w`,
    },
    {
      path: "rotate_array.py",
      lang: "python",
      code: `def rotate(nums, k):
    k %= len(nums)
    nums[:] = nums[-k:] + nums[:-k]`,
    },
    {
      path: "longest_common_prefix.py",
      lang: "python",
      code: `def longest_common_prefix(strs):
    if not strs:
        return ""
    for i, chars in enumerate(zip(*strs)):
        if len(set(chars)) > 1:
            return strs[0][:i]
    return strs[0]`,
    },
    {
      path: "remove_element.py",
      lang: "python",
      code: `def remove_element(nums, val):
    w = 0
    for n in nums:
        if n != val:
            nums[w] = n
            w += 1
    return w`,
    },
    {
      path: "majority_element.py",
      lang: "python",
      code: `def majority(nums):
    cand, count = None, 0
    for n in nums:
        if count == 0:
            cand, count = n, 1
        elif n == cand:
            count += 1
        else:
            count -= 1
    return cand`,
    },
    {
      path: "happy_number.py",
      lang: "python",
      code: `def is_happy(n):
    seen = set()
    while n not in seen:
        if n == 1:
            return True
        seen.add(n)
        n = sum(int(d) ** 2 for d in str(n))
    return False`,
    },
    {
      path: "isomorphic_strings.py",
      lang: "python",
      code: `def is_isomorphic(s, t):
    if len(s) != len(t):
        return False
    a, b = {}, {}
    for x, y in zip(s, t):
        if a.setdefault(x, y) != y or b.setdefault(y, x) != x:
            return False
    return True`,
    },
    {
      path: "ransom_note.py",
      lang: "python",
      code: `def can_construct(ransom, magazine):
    need = {}
    for c in ransom:
        need[c] = need.get(c, 0) + 1
    for c in magazine:
        if c in need:
            need[c] -= 1
            if need[c] == 0:
                del need[c]
    return not need`,
    },
    {
      path: "summary_ranges.py",
      lang: "python",
      code: `def summary_ranges(nums):
    out, i = [], 0
    while i < len(nums):
        j = i
        while j + 1 < len(nums) and nums[j + 1] == nums[j] + 1:
            j += 1
        out.append(f"{nums[i]}->{nums[j]}" if i != j else str(nums[i]))
        i = j + 1
    return out`,
    },
  ],
  reverse_list: [
    {
      path: "reverse_list.go",
      lang: "go",
      code: `func reverse(h *Node) *Node {
    var prev *Node
    for h != nil {
        next := h.Next
        h.Next = prev
        prev, h = h, next
    }
    return prev
}`,
    },
    { path: "gig_board_backend.py", lang: "python", code: "def run_app() -> bool:\n    return True" },
    {
      path: "merge_two_lists.py",
      lang: "python",
      code: `def merge(l1, l2):
    head = cur = ListNode()
    while l1 and l2:
        if l1.val <= l2.val:
            cur.next, l1 = l1, l1.next
        else:
            cur.next, l2 = l2, l2.next
        cur = cur.next
    cur.next = l1 or l2
    return head.next`,
    },
    {
      path: "linked_list_cycle.py",
      lang: "python",
      code: `def has_cycle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
        if slow is fast:
            return True
    return False`,
    },
    {
      path: "middle_node.py",
      lang: "python",
      code: `def middle(head):
    slow = fast = head
    while fast and fast.next:
        slow = slow.next
        fast = fast.next.next
    return slow`,
    },
    {
      path: "valid_parentheses.py",
      lang: "python",
      code: `def is_valid(s):
    stack, pairs = [], {")": "(", "]": "[", "}": "{"}
    for c in s:
        if c in pairs.values():
            stack.append(c)
        elif not stack or stack.pop() != pairs[c]:
            return False
    return not stack`,
    },
    {
      path: "min_stack.py",
      lang: "python",
      code: `class MinStack:
    def __init__(self):
        self.stack, self.mins = [], []
    def push(self, x):
        self.stack.append(x)
        self.mins.append(min(x, self.mins[-1] if self.mins else x))
    def pop(self):
        self.stack.pop(); self.mins.pop()`,
    },
    {
      path: "binary_search.py",
      lang: "python",
      code: `def search(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        if nums[mid] < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1`,
    },
    {
      path: "first_bad_version.py",
      lang: "python",
      code: `def first_bad(n):
    lo, hi = 1, n
    while lo < hi:
        mid = (lo + hi) // 2
        if is_bad(mid):
            hi = mid
        else:
            lo = mid + 1
    return lo`,
    },
    {
      path: "max_depth_tree.py",
      lang: "python",
      code: `def max_depth(root):
    if not root:
        return 0
    return 1 + max(max_depth(root.left), max_depth(root.right))`,
    },
    {
      path: "invert_tree.py",
      lang: "python",
      code: `def invert(root):
    if not root:
        return None
    root.left, root.right = invert(root.right), invert(root.left)
    return root`,
    },
    {
      path: "symmetric_tree.py",
      lang: "python",
      code: `def is_symmetric(root):
    def mirror(a, b):
        if not a and not b:
            return True
        if not a or not b or a.val != b.val:
            return False
        return mirror(a.left, b.right) and mirror(a.right, b.left)
    return mirror(root, root)`,
    },
    {
      path: "path_sum.py",
      lang: "python",
      code: `def has_path_sum(root, target):
    if not root:
        return False
    if not root.left and not root.right:
        return root.val == target
    need = target - root.val
    return has_path_sum(root.left, need) or has_path_sum(root.right, need)`,
    },
    {
      path: "level_order.py",
      lang: "python",
      code: `def level_order(root):
    if not root:
        return []
    out, q = [], [root]
    while q:
        row, n = [], len(q)
        for _ in range(n):
            node = q.pop(0)
            row.append(node.val)
            if node.left:
                q.append(node.left)
            if node.right:
                q.append(node.right)
        out.append(row)
    return out`,
    },
    {
      path: "number_of_islands.py",
      lang: "python",
      code: `def num_islands(grid):
    def sink(r, c):
        if r < 0 or c < 0 or r >= len(grid) or c >= len(grid[0]) or grid[r][c] != "1":
            return
        grid[r][c] = "0"
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            sink(r + dr, c + dc)
    count = 0
    for r in range(len(grid)):
        for c in range(len(grid[0])):
            if grid[r][c] == "1":
                sink(r, c)
                count += 1
    return count`,
    },
    {
      path: "flood_fill.py",
      lang: "python",
      code: `def flood_fill(image, sr, sc, color):
    base = image[sr][sc]
    if base == color:
        return image
    stack = [(sr, sc)]
    while stack:
        r, c = stack.pop()
        if image[r][c] != base:
            continue
        image[r][c] = color
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nr, nc = r + dr, c + dc
            if 0 <= nr < len(image) and 0 <= nc < len(image[0]):
                stack.append((nr, nc))
    return image`,
    },
    {
      path: "daily_temperatures.py",
      lang: "python",
      code: `def daily_temperatures(temps):
    out, stack = [0] * len(temps), []
    for i, t in enumerate(temps):
        while stack and temps[stack[-1]] < t:
            j = stack.pop()
            out[j] = i - j
        stack.append(i)
    return out`,
    },
    {
      path: "rotting_oranges.py",
      lang: "python",
      code: `def oranges(grid):
    q, fresh = [], 0
    for r, row in enumerate(grid):
        for c, v in enumerate(row):
            if v == 2: q.append((r, c, 0))
            elif v == 1: fresh += 1
    t = 0
    while q and fresh:
        r, c, t = q.pop(0)
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nr, nc = r + dr, c + dc
            if 0 <= nr < len(grid) and 0 <= nc < len(grid[0]) and grid[nr][nc] == 1:
                grid[nr][nc] = 2; fresh -= 1; q.append((nr, nc, t + 1))
    return t if fresh == 0 else -1`,
    },
    {
      path: "course_schedule.py",
      lang: "python",
      code: `def can_finish(n, edges):
    graph = [[] for _ in range(n)]
    for a, b in edges:
        graph[a].append(b)
    state = [0] * n
    def dfs(v):
        if state[v] == 1:
            return False
        if state[v] == 2:
            return True
        state[v] = 1
        for w in graph[v]:
            if not dfs(w):
                return False
        state[v] = 2
        return True
    return all(dfs(i) for i in range(n))`,
    },
    {
      path: "kth_largest.py",
      lang: "python",
      code: `import heapq

def kth_largest(nums, k):
    heap = nums[:k]
    heapq.heapify(heap)
    for n in nums[k:]:
        if n > heap[0]:
            heapq.heapreplace(heap, n)
    return heap[0]`,
    },
    {
      path: "top_k_frequent.py",
      lang: "python",
      code: `def top_k_frequent(nums, k):
    count = {}
    for n in nums:
        count[n] = count.get(n, 0) + 1
    buckets = [[] for _ in range(len(nums) + 1)]
    for n, c in count.items():
        buckets[c].append(n)
    out = []
    for i in range(len(buckets) - 1, -1, -1):
        for n in buckets[i]:
            out.append(n)
            if len(out) == k:
                return out
    return out`,
    },
  ],
  debounce: [
    {
      path: "src/debounce.ts",
      lang: "ts",
      code: `export function debounce<T extends (...a: any[]) => void>(fn: T, ms: number) {
  let t: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}`,
    },
    { path: "typeahead_service.py", lang: "python", code: "def run_app() -> bool:\n    return True" },
    {
      path: "src/debounce.test.ts",
      lang: "ts",
      code: `import { debounce } from "./debounce";
import { expect, test, vi } from "vitest";

test("fires once after quiet", () => {
  vi.useFakeTimers();
  const fn = vi.fn();
  const run = debounce(fn, 100);
  run(1); run(2);
  vi.advanceTimersByTime(100);
  expect(fn).toHaveBeenCalledTimes(1);
});`,
    },
    {
      path: "group_anagrams.py",
      lang: "python",
      code: `def group_anagrams(strs):
    groups = {}
    for s in strs:
        key = tuple(sorted(s))
        groups.setdefault(key, []).append(s)
    return list(groups.values())`,
    },
    {
      path: "longest_substring.py",
      lang: "python",
      code: `def length_of_longest(s):
    last, start, best = {}, 0, 0
    for i, c in enumerate(s):
        if c in last and last[c] >= start:
            start = last[c] + 1
        last[c] = i
        best = max(best, i - start + 1)
    return best`,
    },
    {
      path: "three_sum.py",
      lang: "python",
      code: `def three_sum(nums):
    nums.sort()
    out = []
    for i in range(len(nums) - 2):
        lo, hi = i + 1, len(nums) - 1
        while lo < hi:
            s = nums[i] + nums[lo] + nums[hi]
            if s == 0:
                out.append([nums[i], nums[lo], nums[hi]])
                lo += 1; hi -= 1
            elif s < 0:
                lo += 1
            else:
                hi -= 1
    return out`,
    },
    {
      path: "product_except_self.py",
      lang: "python",
      code: `def product_except_self(nums):
    out = [1] * len(nums)
    prefix = 1
    for i in range(len(nums)):
        out[i] = prefix
        prefix *= nums[i]
    suffix = 1
    for i in range(len(nums) - 1, -1, -1):
        out[i] *= suffix
        suffix *= nums[i]
    return out`,
    },
    {
      path: "container_water.py",
      lang: "python",
      code: `def max_area(h):
    lo, hi, best = 0, len(h) - 1, 0
    while lo < hi:
        best = max(best, min(h[lo], h[hi]) * (hi - lo))
        if h[lo] < h[hi]:
            lo += 1
        else:
            hi -= 1
    return best`,
    },
    {
      path: "subarray_sum_k.py",
      lang: "python",
      code: `def subarray_sum(nums, k):
    count, prefix = 0, {0: 1}
    run = 0
    for n in nums:
        run += n
        count += prefix.get(run - k, 0)
        prefix[run] = prefix.get(run, 0) + 1
    return count`,
    },
    {
      path: "coin_change.py",
      lang: "python",
      code: `def coin_change(coins, amount):
    dp = [amount + 1] * (amount + 1)
    dp[0] = 0
    for a in range(1, amount + 1):
        for c in coins:
            if c <= a:
                dp[a] = min(dp[a], dp[a - c] + 1)
    return dp[amount] if dp[amount] <= amount else -1`,
    },
    {
      path: "house_robber.py",
      lang: "python",
      code: `def rob(nums):
    prev, cur = 0, 0
    for n in nums:
        prev, cur = cur, max(cur, prev + n)
    return cur`,
    },
    {
      path: "word_break.py",
      lang: "python",
      code: `def word_break(s, words):
    ok = [True] + [False] * len(s)
    for i in range(1, len(s) + 1):
        for j in range(i):
            if ok[j] and s[j:i] in words:
                ok[i] = True
                break
    return ok[len(s)]`,
    },
    {
      path: "unique_paths.py",
      lang: "python",
      code: `def unique_paths(m, n):
    row = [1] * n
    for _ in range(1, m):
        for j in range(1, n):
            row[j] += row[j - 1]
    return row[-1]`,
    },
    {
      path: "jump_game.py",
      lang: "python",
      code: `def can_jump(nums):
    reach = 0
    for i, n in enumerate(nums):
        if i > reach:
            return False
        reach = max(reach, i + n)
    return True`,
    },
    {
      path: "decode_string.py",
      lang: "python",
      code: `def decode_string(s):
    stack, cur, num = [], "", 0
    for c in s:
        if c.isdigit():
            num = num * 10 + int(c)
        elif c == "[":
            stack.append((cur, num))
            cur, num = "", 0
        elif c == "]":
            prev, k = stack.pop()
            cur = prev + cur * k
        else:
            cur += c
    return cur`,
    },
    {
      path: "implement_trie.py",
      lang: "python",
      code: `class Trie:
    def __init__(self):
        self.root = {}
    def insert(self, word):
        node = self.root
        for c in word:
            node = node.setdefault(c, {})
        node["#"] = True`,
    },
    {
      path: "number_of_islands.py",
      lang: "python",
      code: `def num_islands(grid):
    def sink(r, c):
        if r < 0 or c < 0 or r >= len(grid) or c >= len(grid[0]) or grid[r][c] != "1":
            return
        grid[r][c] = "0"
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            sink(r + dr, c + dc)
    n = 0
    for r in range(len(grid)):
        for c in range(len(grid[0])):
            if grid[r][c] == "1":
                sink(r, c)
                n += 1
    return n`,
    },
    {
      path: "rotting_oranges.py",
      lang: "python",
      code: `def oranges(grid):
    q, fresh = [], 0
    for r, row in enumerate(grid):
        for c, v in enumerate(row):
            if v == 2:
                q.append((r, c, 0))
            elif v == 1:
                fresh += 1
    t = 0
    while q and fresh:
        r, c, t = q.pop(0)
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            nr, nc = r + dr, c + dc
            if 0 <= nr < len(grid) and 0 <= nc < len(grid[0]) and grid[nr][nc] == 1:
                grid[nr][nc] = 2
                fresh -= 1
                q.append((nr, nc, t + 1))
    return t if fresh == 0 else -1`,
    },
    {
      path: "meeting_rooms.py",
      lang: "python",
      code: `def can_attend(intervals):
    intervals.sort(key=lambda x: x[0])
    for i in range(1, len(intervals)):
        if intervals[i][0] < intervals[i - 1][1]:
            return False
    return True`,
    },
    {
      path: "merge_intervals.py",
      lang: "python",
      code: `def merge(intervals):
    intervals.sort()
    out = []
    for start, end in intervals:
        if not out or start > out[-1][1]:
            out.append([start, end])
        else:
            out[-1][1] = max(out[-1][1], end)
    return out`,
    },
    {
      path: "serialize_tree.py",
      lang: "python",
      code: `def serialize(root):
    if not root:
        return "null"
    return f"{root.val},{serialize(root.left)},{serialize(root.right)}"`,
    },
  ],
  search: [
    {
      path: "BinarySearch.java",
      lang: "java",
      code: `public class BinarySearch {
  static int search(int[] a, int x) {
    int lo = 0, hi = a.length - 1;
    while (lo <= hi) {
      int mid = (lo + hi) >>> 1;
      if (a[mid] < x) lo = mid + 1;
      else if (a[mid] > x) hi = mid - 1;
      else return mid;
    }
    return -1;
  }
}`,
    },
    { path: "log_inspector.py", lang: "python", code: "def run_app() -> bool:\n    return True" },
    {
      path: "SearchInsert.java",
      lang: "java",
      code: `class SearchInsert {
  int searchInsert(int[] a, int x) {
    int lo = 0, hi = a.length;
    while (lo < hi) {
      int mid = (lo + hi) >>> 1;
      if (a[mid] < x) lo = mid + 1;
      else hi = mid;
    }
    return lo;
  }
}`,
    },
    {
      path: "find_peak.py",
      lang: "python",
      code: `def find_peak(nums):
    lo, hi = 0, len(nums) - 1
    while lo < hi:
        mid = (lo + hi) // 2
        if nums[mid] < nums[mid + 1]:
            lo = mid + 1
        else:
            hi = mid
    return lo`,
    },
    {
      path: "search_rotated.py",
      lang: "python",
      code: `def search(nums, target):
    lo, hi = 0, len(nums) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if nums[mid] == target:
            return mid
        if nums[lo] <= nums[mid]:
            if nums[lo] <= target < nums[mid]:
                hi = mid - 1
            else:
                lo = mid + 1
        elif target <= nums[hi] and target > nums[mid]:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1`,
    },
    {
      path: "sqrt_binary.py",
      lang: "python",
      code: `def my_sqrt(x):
    if x < 2:
        return x
    lo, hi = 1, x // 2
    while lo <= hi:
        mid = (lo + hi) // 2
        if mid * mid == x:
            return mid
        if mid * mid < x:
            lo = mid + 1
        else:
            hi = mid - 1
    return hi`,
    },
    {
      path: "koko_bananas.py",
      lang: "python",
      code: `def min_eating_speed(piles, h):
    lo, hi = 1, max(piles)
    while lo < hi:
        mid = (lo + hi) // 2
        hours = sum((p + mid - 1) // mid for p in piles)
        if hours <= h:
            hi = mid
        else:
            lo = mid + 1
    return lo`,
    },
    {
      path: "median_sorted_arrays.py",
      lang: "python",
      code: `def find_median(a, b):
    if len(a) > len(b):
        a, b = b, a
    i, j = 0, len(a)
    while i <= j:
        ai = (i + j) // 2
        bi = (len(a) + len(b) + 1) // 2 - ai
        left = max(a[ai - 1] if ai else float("-inf"), b[bi - 1] if bi else float("-inf"))
        right = min(a[ai] if ai < len(a) else float("inf"), b[bi] if bi < len(b) else float("inf"))
        if (len(a) + len(b)) % 2:
            return left
        return (left + right) / 2`,
    },
    {
      path: "time_map.py",
      lang: "python",
      code: `class TimeMap:
    def __init__(self):
        self.store = {}
    def set(self, key, value, ts):
        self.store.setdefault(key, []).append((ts, value))
    def get(self, key, ts):
        arr = self.store.get(key, [])
        lo, hi = 0, len(arr) - 1
        ans = ""
        while lo <= hi:
            mid = (lo + hi) // 2
            if arr[mid][0] <= ts:
                ans = arr[mid][1]
                lo = mid + 1
            else:
                hi = mid - 1
        return ans`,
    },
    {
      path: "random_pick_weight.py",
      lang: "python",
      code: `import bisect, random

class Solution:
    def __init__(self, w):
        self.prefix = []
        run = 0
        for x in w:
            run += x
            self.prefix.append(run)
    def pickIndex(self):
        target = random.randint(1, self.prefix[-1])
        return bisect.bisect_left(self.prefix, target)`,
    },
    {
      path: "capacity_ship.py",
      lang: "python",
      code: `def ship_within_days(weights, days):
    lo, hi = max(weights), sum(weights)
    while lo < hi:
        mid = (lo + hi) // 2
        need, load = 1, 0
        for w in weights:
            if load + w > mid:
                need += 1
                load = 0
            load += w
        if need <= days:
            hi = mid
        else:
            lo = mid + 1
    return lo`,
    },
    {
      path: "split_array_largest.py",
      lang: "python",
      code: `def split_array(nums, k):
    lo, hi = max(nums), sum(nums)
    while lo < hi:
        mid = (lo + hi) // 2
        parts, run = 1, 0
        for n in nums:
            if run + n > mid:
                parts += 1
                run = 0
            run += n
        if parts <= k:
            hi = mid
        else:
            lo = mid + 1
    return lo`,
    },
    {
      path: "find_min_rotated.py",
      lang: "python",
      code: `def find_min(nums):
    lo, hi = 0, len(nums) - 1
    while lo < hi:
        mid = (lo + hi) // 2
        if nums[mid] > nums[hi]:
            lo = mid + 1
        else:
            hi = mid
    return nums[lo]`,
    },
    {
      path: "search_2d_matrix.py",
      lang: "python",
      code: `def search_matrix(matrix, target):
    if not matrix:
        return False
    m, n = len(matrix), len(matrix[0])
    lo, hi = 0, m * n - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        val = matrix[mid // n][mid % n]
        if val == target:
            return True
        if val < target:
            lo = mid + 1
        else:
            hi = mid - 1
    return False`,
    },
    {
      path: "count_smaller.py",
      lang: "python",
      code: `def count_smaller(nums):
    sorted_vals, out = [], []
    for n in reversed(nums):
        lo, hi = 0, len(sorted_vals)
        while lo < hi:
            mid = (lo + hi) // 2
            if sorted_vals[mid] >= n:
                hi = mid
            else:
                lo = mid + 1
        out.append(lo)
        sorted_vals.insert(lo, n)
    return out[::-1]`,
    },
    {
      path: "longest_increasing.py",
      lang: "python",
      code: `def length_of_lis(nums):
    piles = []
    for n in nums:
        lo, hi = 0, len(piles)
        while lo < hi:
            mid = (lo + hi) // 2
            if piles[mid] < n:
                lo = mid + 1
            else:
                hi = mid
        if lo == len(piles):
            piles.append(n)
        else:
            piles[lo] = n
    return len(piles)`,
    },
    {
      path: "peak_index.py",
      lang: "python",
      code: `def peak_index(arr):
    lo, hi = 0, len(arr) - 1
    while lo < hi:
        mid = (lo + hi) // 2
        if arr[mid] < arr[mid + 1]:
            lo = mid + 1
        else:
            hi = mid
    return lo`,
    },
    {
      path: "single_element.py",
      lang: "python",
      code: `def single_non_duplicate(nums):
    lo, hi = 0, len(nums) - 1
    while lo < hi:
        mid = (lo + hi) // 2
        if mid % 2 == 1:
            mid -= 1
        if nums[mid] == nums[mid + 1]:
            lo = mid + 2
        else:
            hi = mid
    return nums[lo]`,
    },
    {
      path: "binary_search_tree.py",
      lang: "python",
      code: `def search_bst(root, val):
    cur = root
    while cur:
        if val == cur.val:
            return cur
        cur = cur.left if val < cur.val else cur.right
    return None`,
    },
    {
      path: "closest_bst.py",
      lang: "python",
      code: `def closest_value(root, target):
    cur, best = root, root.val
    while cur:
        if abs(cur.val - target) < abs(best - target):
            best = cur.val
        cur = cur.left if target < cur.val else cur.right
    return best`,
    },
    {
      path: "range_sum_bst.py",
      lang: "python",
      code: `def range_sum_bst(root, low, high):
    if not root:
        return 0
    if root.val > high:
        return range_sum_bst(root.left, low, high)
    if root.val < low:
        return range_sum_bst(root.right, low, high)
    return root.val + range_sum_bst(root.left, low, high) + range_sum_bst(root.right, low, high)`,
    },
  ],
  workers: [
    { path: "batch_runner.py", lang: "python", code: "def run_app() -> bool:\n    return True" },
    {
      path: "main.go",
      lang: "go",
      code: `package main

func main() {
    jobs := make(chan Job, 64)
    go feed(jobs)
    pool(4, jobs)
}`,
    },
    {
      path: "worker.go",
      lang: "go",
      code: `package main

func pool(n int, jobs <-chan Job) {
    for i := 0; i < n; i++ {
        go func() {
            for j := range jobs { j.Run() }
        }()
    }
}`,
    },
    {
      path: "go.mod",
      lang: "mod",
      code: `module example.com/workers

go 1.22`,
    },
    {
      path: "print_in_order.py",
      lang: "python",
      code: `class Foo:
    def __init__(self):
        self.second = threading.Event()
        self.third = threading.Event()
    def first(self, printFirst):
        printFirst()
        self.second.set()
    def second(self, printSecond):
        self.second.wait()
        printSecond()
        self.third.set()`,
    },
    {
      path: "dining_philosophers.py",
      lang: "python",
      code: `class DiningPhilosophers:
    def __init__(self):
        self.forks = [threading.Lock() for _ in range(5)]
    def wants_to_eat(self, i, pick, eat):
        first, second = sorted([i, (i + 1) % 5])
        with self.forks[first], self.forks[second]:
            pick()
            eat()`,
    },
    {
      path: "web_crawler.py",
      lang: "python",
      code: `def crawl(start, n, getUrls):
    seen, q = {start}, deque([start])
    host = start.split("/")[2]
    while q and len(seen) < n:
        url = q.popleft()
        for nxt in getUrls(url):
            if nxt not in seen and host in nxt:
                seen.add(nxt)
                q.append(nxt)
    return list(seen)`,
    },
    {
      path: "task_scheduler.py",
      lang: "python",
      code: `def least_interval(tasks, n):
    count = Counter(tasks)
    max_freq = max(count.values())
    slots = (max_freq - 1) * (n + 1)
    for c in count.values():
        if c == max_freq:
            slots += 1
    return max(len(tasks), slots)`,
    },
    {
      path: "producer_consumer.py",
      lang: "python",
      code: `class BoundedQueue:
    def __init__(self, cap):
        self.cap, self.q, self.lock = cap, deque(), threading.Condition()
    def put(self, x):
        with self.lock:
            while len(self.q) == self.cap:
                self.lock.wait()
            self.q.append(x)
            self.lock.notify()`,
    },
    {
      path: "rate_limiter_token.py",
      lang: "python",
      code: `class TokenBucket:
    def __init__(self, rate, burst):
        self.rate, self.burst, self.tokens, self.t = rate, burst, burst, time.time()
    def allow(self):
        now = time.time()
        self.tokens = min(self.burst, self.tokens + (now - self.t) * self.rate)
        self.t = now
        if self.tokens < 1:
            return False
        self.tokens -= 1
        return True`,
    },
    {
      path: "parallel_merge.py",
      lang: "python",
      code: `def merge_sort(arr):
    if len(arr) < 2:
        return arr
    mid = len(arr) // 2
    left = merge_sort(arr[:mid])
    right = merge_sort(arr[mid:])
    return merge(left, right)`,
    },
    {
      path: "thread_pool_submit.py",
      lang: "python",
      code: `from concurrent.futures import ThreadPoolExecutor

def map_jobs(fn, items, workers=4):
    with ThreadPoolExecutor(max_workers=workers) as pool:
        return list(pool.map(fn, items))`,
    },
    {
      path: "barrier_workers.py",
      lang: "python",
      code: `class SyncWorkers:
    def __init__(self, n):
        self.barrier = threading.Barrier(n)
    def step(self, worker_id):
        self.barrier.wait()
        return worker_id`,
    },
    {
      path: "async_fetch.py",
      lang: "python",
      code: `async def fetch_all(urls):
    async with aiohttp.ClientSession() as session:
        tasks = [session.get(u) for u in urls]
        return await asyncio.gather(*tasks)`,
    },
    {
      path: "lru_concurrent.py",
      lang: "python",
      code: `class ConcurrentLru:
    def __init__(self, cap):
        self.cap, self.data, self.lock = cap, OrderedDict(), threading.Lock()
    def get(self, key):
        with self.lock:
            if key not in self.data:
                return -1
            self.data.move_to_end(key)
            return self.data[key]`,
    },
    {
      path: "semaphore_download.py",
      lang: "python",
      code: `class Downloader:
    def __init__(self, limit):
        self.sem = threading.Semaphore(limit)
    def fetch(self, url):
        with self.sem:
            return requests.get(url).text`,
    },
    {
      path: "deadlock_bank.py",
      lang: "python",
      code: `class Account:
    def __init__(self, bal):
        self.bal, self.lock = bal, threading.Lock()
    def transfer(self, other, amt):
        first, second = (self, other) if id(self) < id(other) else (other, self)
        with first.lock, second.lock:
            self.bal -= amt
            other.bal += amt`,
    },
    {
      path: "word_ladder_parallel.py",
      lang: "python",
      code: `def ladder_length(begin, end, word_list):
    words = set(word_list)
    q = deque([(begin, 1)])
    while q:
        word, steps = q.popleft()
        if word == end:
            return steps
        for i in range(len(word)):
            for c in "abcdefghijklmnopqrstuvwxyz":
                nxt = word[:i] + c + word[i + 1:]
                if nxt in words:
                    words.remove(nxt)
                    q.append((nxt, steps + 1))
    return 0`,
    },
    {
      path: "merge_k_lists.py",
      lang: "python",
      code: `import heapq

def merge_k_lists(lists):
    heap = []
    for i, node in enumerate(lists):
        if node:
            heapq.heappush(heap, (node.val, i, node))
    head = cur = ListNode()
    while heap:
        _, i, node = heapq.heappop(heap)
        cur.next = node
        cur = cur.next
        if node.next:
            heapq.heappush(heap, (node.next.val, i, node.next))
    return head.next`,
    },
    {
      path: "design_hit_counter.py",
      lang: "python",
      code: `class HitCounter:
    def __init__(self):
        self.q = deque()
    def hit(self, ts):
        self.q.append(ts)
    def getHits(self, ts):
        while self.q and self.q[0] <= ts - 300:
            self.q.popleft()
        return len(self.q)`,
    },
    {
      path: "logger_rate_limit.py",
      lang: "python",
      code: `class Logger:
    def __init__(self):
        self.last = {}
    def shouldPrintMessage(self, ts, msg):
        if ts - self.last.get(msg, -10) >= 10:
            self.last[msg] = ts
            return True
        return False`,
    },
  ],
  finetune: [
    {
      path: "train.py",
      lang: "python",
      code: `from data import loader
from config import cfg

for step, batch in enumerate(loader(cfg.batch)):
    loss = model(batch).loss
    loss.backward()
    opt.step(); opt.zero_grad()
    if step % 100 == 0:
        log(eval_loss(model))`,
    },
    { path: "experiment_lab.py", lang: "python", code: "def run_app() -> bool:\n    return True" },
    {
      path: "data.py",
      lang: "python",
      code: `import random

def loader(batch, n=1000):
    for _ in range(n):
        yield [random.random() for _ in range(batch)]`,
    },
    {
      path: "config.yaml",
      lang: "yaml",
      code: `lr: 0.00002
batch: 16
epochs: 3
warmup_steps: 100`,
    },
    {
      path: "gradient_clip.py",
      lang: "python",
      code: `def clip_grad_norm(params, max_norm):
    total = sum(p.grad.pow(2).sum() for p in params if p.grad is not None)
    norm = total.sqrt()
    if norm > max_norm:
        scale = max_norm / (norm + 1e-6)
        for p in params:
            if p.grad is not None:
                p.grad.mul_(scale)`,
    },
    {
      path: "cosine_schedule.py",
      lang: "python",
      code: `def cosine_lr(step, warmup, total, base):
    if step < warmup:
        return base * step / warmup
    t = (step - warmup) / max(1, total - warmup)
    return base * 0.5 * (1 + math.cos(math.pi * t))`,
    },
    {
      path: "tokenize.py",
      lang: "python",
      code: `def encode(text, vocab):
    return [vocab.get(t, vocab["<unk>"]) for t in text.split()]`,
    },
    {
      path: "batch_norm.py",
      lang: "python",
      code: `def batch_norm(x, mean, var, gamma, beta, eps=1e-5):
    x_hat = (x - mean) / (var + eps).sqrt()
    return gamma * x_hat + beta`,
    },
    {
      path: "cross_entropy.py",
      lang: "python",
      code: `def cross_entropy(logits, target):
    log_probs = logits.log_softmax(dim=-1)
    return -log_probs.gather(-1, target.unsqueeze(-1)).mean()`,
    },
    {
      path: "adam_step.py",
      lang: "python",
      code: `def adam(param, grad, m, v, t, lr=1e-3):
    m = 0.9 * m + 0.1 * grad
    v = 0.99 * v + 0.01 * grad * grad
    m_hat = m / (1 - 0.9 ** t)
    v_hat = v / (1 - 0.99 ** t)
    param -= lr * m_hat / (v_hat.sqrt() + 1e-8)`,
    },
    {
      path: "checkpoint.py",
      lang: "python",
      code: `def save_checkpoint(model, opt, path, step):
    torch.save({"model": model.state_dict(), "opt": opt.state_dict(), "step": step}, path)`,
    },
    {
      path: "eval_loop.py",
      lang: "python",
      code: `def evaluate(model, data):
    model.eval()
    loss = 0.0
    with torch.no_grad():
        for batch in data:
            loss += model(batch).loss.item()
    model.train()
    return loss / len(data)`,
    },
    {
      path: "mixup.py",
      lang: "python",
      code: `def mixup(x, y, alpha=0.2):
    lam = random.betavariate(alpha, alpha)
    idx = torch.randperm(x.size(0))
    x2, y2 = x[idx], y[idx]
    return lam * x + (1 - lam) * x2, y, y2, lam`,
    },
    {
      path: "dropout.py",
      lang: "python",
      code: `def dropout(x, p=0.1, training=True):
    if not training or p == 0:
        return x
    mask = (torch.rand_like(x) > p).float()
    return x * mask / (1 - p)`,
    },
    {
      path: "softmax.py",
      lang: "python",
      code: `def softmax(x, dim=-1):
    z = x - x.max(dim=dim, keepdim=True).values
    e = z.exp()
    return e / e.sum(dim=dim, keepdim=True)`,
    },
    {
      path: "rope.py",
      lang: "python",
      code: `def apply_rope(q, k, freqs):
    def rotate(x):
        x1, x2 = x[..., ::2], x[..., 1::2]
        return torch.stack((x1 * freqs - x2 * freqs, x1 * freqs + x2 * freqs), dim=-1)
    return rotate(q), rotate(k)`,
    },
    {
      path: "kv_cache.py",
      lang: "python",
      code: `class KVCache:
    def __init__(self):
        self.k, self.v = [], []
    def append(self, k, v):
        self.k.append(k)
        self.v.append(v)
    def tensors(self):
        return torch.cat(self.k, dim=1), torch.cat(self.v, dim=1)`,
    },
    {
      path: "lora_layer.py",
      lang: "python",
      code: `class LoRALinear:
    def __init__(self, base, rank=8, alpha=16):
        self.base = base
        self.a = nn.Linear(base.in_features, rank, bias=False)
        self.b = nn.Linear(rank, base.out_features, bias=False)
        self.scale = alpha / rank`,
    },
    {
      path: "dataloader.py",
      lang: "python",
      code: `def make_loader(dataset, batch, workers=4):
    return DataLoader(dataset, batch_size=batch, shuffle=True, num_workers=workers, pin_memory=True)`,
    },
    {
      path: "bleu_score.py",
      lang: "python",
      code: `def bleu(candidate, refs, n=4):
    precisions = []
    for i in range(1, n + 1):
        cand_ngrams = ngrams(candidate, i)
        max_match = sum(max(count(cand_ngrams, g) for g in refs) for g in set(cand_ngrams))
        precisions.append(max_match / max(1, len(cand_ngrams)))
    return (math.prod(precisions)) ** (1 / n)`,
    },
    {
      path: "early_stop.py",
      lang: "python",
      code: `class EarlyStop:
    def __init__(self, patience=3):
        self.best, self.wait, self.patience = float("inf"), 0, patience
    def step(self, loss):
        if loss < self.best:
            self.best, self.wait = loss, 0
            return False
        self.wait += 1
        return self.wait >= self.patience`,
    },
  ],
  ratelimit: [
    { path: "edge_gateway.py", lang: "python", code: "def run_app() -> bool:\n    return True" },
    {
      path: "tokenBucket.ts",
      lang: "ts",
      code: `export class TokenBucket {
  constructor(private r: number, private burst: number, private tokens = burst) {}
  take() {
    this.tokens = Math.min(this.burst, this.tokens + this.r);
    if (this.tokens < 1) return false;
    this.tokens -= 1; return true;
  }
}`,
    },
    {
      path: "middleware.ts",
      lang: "ts",
      code: `import { TokenBucket } from "./tokenBucket";
import type { Req } from "./types";

const buckets = new Map<string, TokenBucket>();

export function limit(req: Req): 200 | 429 {
  let b = buckets.get(req.ip);
  if (!b) buckets.set(req.ip, (b = new TokenBucket(1, 10)));
  return b.take() ? 200 : 429;
}`,
    },
    {
      path: "types.ts",
      lang: "ts",
      code: `export type Limit = { rate: number; burst: number };
export type Req = { ip: string; path: string };`,
    },
    {
      path: "sliding_window.py",
      lang: "python",
      code: `class SlidingWindow:
    def __init__(self, limit, window):
        self.limit, self.window, self.q = limit, window, deque()
    def allow(self, ts):
        while self.q and self.q[0] <= ts - self.window:
            self.q.popleft()
        if len(self.q) >= self.limit:
            return False
        self.q.append(ts)
        return True`,
    },
    {
      path: "design_twitter.py",
      lang: "python",
      code: `class Twitter:
    def __init__(self):
        self.time, self.posts, self.follows = 0, {}, {}
    def postTweet(self, userId, tweetId):
        self.time += 1
        self.posts.setdefault(userId, []).append((self.time, tweetId))`,
    },
    {
      path: "lfu_cache.py",
      lang: "python",
      code: `class LFUCache:
    def __init__(self, capacity):
        self.cap, self.key_val, self.key_freq, self.freq_keys = capacity, {}, {}, {}
    def get(self, key):
        if key not in self.key_val:
            return -1
        self._touch(key)
        return self.key_val[key]`,
    },
    {
      path: "design_search.py",
      lang: "python",
      code: `class Autocomplete:
    def __init__(self, sentences):
        self.trie = {}
        for s in sentences:
            node = self.trie
            for c in s:
                node = node.setdefault(c, {})
            node["#"] = s`,
    },
    {
      path: "serialize_graph.py",
      lang: "python",
      code: `def clone_graph(node):
    clones = {}
    def dfs(n):
        if n in clones:
            return clones[n]
        copy = Node(n.val)
        clones[n] = copy
        for nei in n.neighbors:
            copy.neighbors.append(dfs(nei))
        return copy
    return dfs(node) if node else None`,
    },
    {
      path: "design_file_system.py",
      lang: "python",
      code: `class FileSystem:
    def __init__(self):
        self.root = {"files": {}, "dirs": {}}
    def mkdir(self, path):
        node = self.root
        for part in path.split("/")[1:]:
            node = node["dirs"].setdefault(part, {"files": {}, "dirs": {}})`,
    },
    {
      path: "median_finder.py",
      lang: "python",
      code: `import heapq

class MedianFinder:
    def __init__(self):
        self.lo, self.hi = [], []
    def addNum(self, num):
        heapq.heappush(self.lo, -num)
        heapq.heappush(self.hi, -heapq.heappop(self.lo))
        if len(self.hi) > len(self.lo):
            heapq.heappush(self.lo, -heapq.heappop(self.hi))`,
    },
    {
      path: "design_leaderboard.py",
      lang: "python",
      code: `class Leaderboard:
    def __init__(self):
        self.scores = {}
    def addScore(self, playerId, score):
        self.scores[playerId] = self.scores.get(playerId, 0) + score
    def top(self, k):
        return sum(sorted(self.scores.values(), reverse=True)[:k])`,
    },
    {
      path: "consistent_hash.py",
      lang: "python",
      code: `class Ring:
    def __init__(self, nodes, replicas=3):
        self.ring = {}
        for n in nodes:
            for i in range(replicas):
                self.ring[hash(f"{n}:{i}")] = n`,
    },
    {
      path: "circuit_breaker.ts",
      lang: "ts",
      code: `export class Breaker {
  state: "closed" | "open" = "closed";
  failures = 0;
  call(fn: () => Promise<void>) {
    if (this.state === "open") throw new Error("open");
    return fn().catch(() => {
      this.failures += 1;
      if (this.failures >= 5) this.state = "open";
    });
  }
}`,
    },
    {
      path: "bulkhead.ts",
      lang: "ts",
      code: `export class Pool {
  private active = 0;
  constructor(private max: number) {}
  async run<T>(fn: () => Promise<T>): Promise<T> {
    if (this.active >= this.max) throw new Error("saturated");
    this.active += 1;
    try { return await fn(); } finally { this.active -= 1; }
  }
}`,
    },
    {
      path: "retry_backoff.ts",
      lang: "ts",
      code: `export async function retry(fn: () => Promise<void>, tries = 5) {
  let wait = 100;
  for (let i = 0; i < tries; i++) {
    try { await fn(); return; } catch { await new Promise((r) => setTimeout(r, wait)); wait *= 2; }
  }
}`,
    },
    {
      path: "idempotency.ts",
      lang: "ts",
      code: `const seen = new Map<string, number>();

export function once(key: string, ttlMs: number, fn: () => void) {
  const now = Date.now();
  const hit = seen.get(key);
  if (hit && now - hit < ttlMs) return;
  seen.set(key, now);
  fn();
}`,
    },
    {
      path: "shuffle_service.py",
      lang: "python",
      code: `class Shuffle:
    def __init__(self, urls):
        self.urls = urls[:]
        random.shuffle(self.urls)
        self.i = 0
    def next(self):
        url = self.urls[self.i % len(self.urls)]
        self.i += 1
        return url`,
    },
    {
      path: "design_snake.py",
      lang: "python",
      code: `class SnakeGame:
    def __init__(self, w, h):
        self.w, self.h, self.snake, self.score = w, h, deque([(0, 0)]), 0
    def move(self, direction):
        head = self.snake[0]
        nxt = (head[0] + direction[0], head[1] + direction[1])
        if not (0 <= nxt[0] < self.w and 0 <= nxt[1] < self.h):
            return self.score
        self.snake.appendleft(nxt)
        self.snake.pop()`,
    },
    {
      path: "design_parking.py",
      lang: "python",
      code: `class ParkingSystem:
    def __init__(self, big, medium, small):
        self.slots = {1: big, 2: medium, 3: small}
    def addCar(self, carType):
        if self.slots[carType] <= 0:
            return False
        self.slots[carType] -= 1
        return True`,
    },
    {
      path: "design_underground.py",
      lang: "python",
      code: `class UndergroundSystem:
    def __init__(self):
        self.checkins, self.routes = {}, {}
    def checkIn(self, id, station, t):
        self.checkins[id] = (station, t)
    def checkOut(self, id, station, t):
        start, t0 = self.checkins.pop(id)
        key = (start, station)
        total, count = self.routes.get(key, (0, 0))
        self.routes[key] = (total + t - t0, count + 1)`,
    },
  ],
  lru: [
    { path: "cache_service.py", lang: "python", code: "def run_app() -> bool:\n    return True" },
    {
      path: "lib.rs",
      lang: "rust",
      code: `mod list;
use std::collections::HashMap;

pub struct Lru<K, V> { map: HashMap<K, usize>, list: list::List<V> }

impl<K: Eq + std::hash::Hash, V> Lru<K, V> {
    pub fn get(&mut self, k: K) -> Option<&V> {
        let i = *self.map.get(&k)?;
        self.list.touch(i);
        self.list.get(i)
    }
}`,
    },
    {
      path: "list.rs",
      lang: "rust",
      code: `pub struct List<V> { nodes: Vec<Node<V>>, head: usize }
struct Node<V> { val: V, prev: usize, next: usize }

impl<V> List<V> {
    pub fn touch(&mut self, i: usize) {
        self.unlink(i);
        self.push_front(i);
    }
    pub fn get(&self, i: usize) -> Option<&V> {
        self.nodes.get(i).map(|n| &n.val)
    }
}`,
    },
    {
      path: "Cargo.toml",
      lang: "toml",
      code: `[package]
name = "lru"
version = "0.1.0"
edition = "2021"`,
    },
    {
      path: "lru_cache.py",
      lang: "python",
      code: `class LRUCache:
    def __init__(self, capacity):
        self.cap, self.cache = capacity, OrderedDict()
    def get(self, key):
        if key not in self.cache:
            return -1
        self.cache.move_to_end(key)
        return self.cache[key]`,
    },
    {
      path: "all_oone.py",
      lang: "python",
      code: `class AllOne:
    def __init__(self):
        self.counts, self.keys = {}, {}
    def inc(self, key):
        self.counts[key] = self.counts.get(key, 0) + 1`,
    },
    {
      path: "design_browser.py",
      lang: "python",
      code: `class Browser:
    def __init__(self, homepage):
        self.cur, self.back, self.fwd = homepage, [], []
    def visit(self, url):
        self.back.append(self.cur)
        self.cur, self.fwd = url, []`,
    },
    {
      path: "max_stack.py",
      lang: "python",
      code: `class MaxStack:
    def __init__(self):
        self.stack, self.maxes = [], []
    def push(self, x):
        self.stack.append(x)
        self.maxes.append(max(x, self.maxes[-1] if self.maxes else x))`,
    },
    {
      path: "remove_k_digits.py",
      lang: "python",
      code: `def remove_k_digits(num, k):
    stack = []
    for d in num:
        while k and stack and stack[-1] > d:
            stack.pop()
            k -= 1
        stack.append(d)
    return "".join(stack[: len(stack) - k]).lstrip("0") or "0"`,
    },
    {
      path: "daily_temperatures.py",
      lang: "python",
      code: `def daily_temperatures(temps):
    out, stack = [0] * len(temps), []
    for i, t in enumerate(temps):
        while stack and temps[stack[-1]] < t:
            j = stack.pop()
            out[j] = i - j
        stack.append(i)
    return out`,
    },
    {
      path: "largest_rectangle.py",
      lang: "python",
      code: `def largest_rectangle(heights):
    stack, best = [-1], 0
    for i, h in enumerate(heights + [0]):
        while stack[-1] != -1 and heights[stack[-1]] > h:
            idx = stack.pop()
            best = max(best, heights[idx] * (i - stack[-1] - 1))
        stack.append(i)
    return best`,
    },
    {
      path: "trapping_rain.py",
      lang: "python",
      code: `def trap(height):
    lo, hi, left, right, water = 0, len(height) - 1, 0, 0, 0
    while lo < hi:
        if height[lo] < height[hi]:
            left = max(left, height[lo])
            water += left - height[lo]
            lo += 1
        else:
            right = max(right, height[hi])
            water += right - height[hi]
            hi -= 1
    return water`,
    },
    {
      path: "min_window_substring.py",
      lang: "python",
      code: `def min_window(s, t):
    need, missing = Counter(t), len(t)
    start, length = 0, float("inf")
    for end, c in enumerate(s, 1):
        if c in need:
            if need[c] > 0:
                missing -= 1
            need[c] -= 1
        while missing == 0:
            if end - start < length:
                start, length = end - len(t), end - start
            c = s[start]
            if c in need:
                need[c] += 1
                if need[c] > 0:
                    missing += 1
            start += 1
    return s[start : start + length] if length != float("inf") else ""`,
    },
    {
      path: "word_break_ii.py",
      lang: "python",
      code: `def word_break(s, words):
    memo = {}
    def dfs(i):
        if i == len(s):
            return [""]
        if i in memo:
            return memo[i]
        out = []
        for w in words:
            if s.startswith(w, i):
                for tail in dfs(i + len(w)):
                    out.append(w + (" " if tail else "") + tail)
        memo[i] = out
        return out
    return dfs(0)`,
    },
    {
      path: "alien_dictionary.py",
      lang: "python",
      code: `def alien_order(words):
    graph = {c: set() for w in words for c in w}
    for a, b in zip(words, words[1:]):
        for x, y in zip(a, b):
            if x != y:
                graph[x].add(y)
                break
    return "".join(sorted(graph))`,
    },
    {
      path: "reconstruct_itinerary.py",
      lang: "python",
      code: `def find_itinerary(tickets):
    graph = {}
    for a, b in sorted(tickets)[::-1]:
        graph.setdefault(a, []).append(b)
    route, stack = [], ["JFK"]
    while stack:
        while graph.get(stack[-1], []):
            stack.append(graph[stack[-1]].pop())
        route.append(stack.pop())
    return route[::-1]`,
    },
    {
      path: "critical_connections.py",
      lang: "python",
      code: `def critical_connections(n, connections):
    graph = [[] for _ in range(n)]
    for a, b in connections:
        graph[a].append(b)
        graph[b].append(a)
    return []`,
    },
    {
      path: "network_delay.py",
      lang: "python",
      code: `def network_delay(times, n, k):
    graph = [[] for _ in range(n + 1)]
    for u, v, w in times:
        graph[u].append((v, w))
    dist = {k: 0}
    heap = [(0, k)]
    while heap:
        d, u = heapq.heappop(heap)
        if d > dist.get(u, float("inf")):
            continue
        for v, w in graph[u]:
            nd = d + w
            if nd < dist.get(v, float("inf")):
                dist[v] = nd
                heapq.heappush(heap, (nd, v))
    return max(dist.values()) if len(dist) == n else -1`,
    },
    {
      path: "cheapest_flights.py",
      lang: "python",
      code: `def find_cheapest(n, flights, src, dst, stops):
    price = [float("inf")] * n
    price[src] = 0
    for _ in range(stops + 1):
        tmp = price[:]
        for u, v, w in flights:
            if price[u] + w < tmp[v]:
                tmp[v] = price[u] + w
        price = tmp
    return price[dst] if price[dst] != float("inf") else -1`,
    },
    {
      path: "word_ladder.py",
      lang: "python",
      code: `def ladder_length(begin, end, word_list):
    words = set(word_list)
    q = deque([(begin, 1)])
    while q:
        word, steps = q.popleft()
        if word == end:
            return steps
        for i in range(len(word)):
            for c in "abcdefghijklmnopqrstuvwxyz":
                nxt = word[:i] + c + word[i + 1:]
                if nxt in words:
                    words.remove(nxt)
                    q.append((nxt, steps + 1))
    return 0`,
    },
    {
      path: "serialize_codec.py",
      lang: "python",
      code: `class Codec:
    def serialize(self, root):
        if not root:
            return "null"
        return f"{root.val},{self.serialize(root.left)},{self.serialize(root.right)}"`,
    },
  ],
  attention: [
    { path: "model_lab.py", lang: "python", code: "def run_app() -> bool:\n    return True" },
    {
      path: "attention.py",
      lang: "python",
      code: `from math import sqrt
from softmax import softmax

def attention(q, k, v):
    score = q @ k.T / sqrt(q.shape[-1])
    w = softmax(score, axis=-1)
    return w @ v`,
    },
    {
      path: "softmax.py",
      lang: "python",
      code: `import numpy as np

def softmax(x, axis=-1):
    z = x - x.max(axis=axis, keepdims=True)
    e = np.exp(z)
    return e / e.sum(axis=axis, keepdims=True)`,
    },
    {
      path: "test_attention.py",
      lang: "python",
      code: `import numpy as np
from attention import attention

def test_shape():
    q = k = v = np.ones((4, 8))
    assert attention(q, k, v).shape == (4, 8)`,
    },
    {
      path: "multi_head.py",
      lang: "python",
      code: `def multi_head(x, w_q, w_k, w_v, heads):
    q = (x @ w_q).reshape(-1, heads, x.shape[-1] // heads)
    k = (x @ w_k).reshape(-1, heads, x.shape[-1] // heads)
    v = (x @ w_v).reshape(-1, heads, x.shape[-1] // heads)
    return attention(q, k, v)`,
    },
    {
      path: "layer_norm.py",
      lang: "python",
      code: `def layer_norm(x, gamma, beta, eps=1e-5):
    mean = x.mean(axis=-1, keepdims=True)
    var = x.var(axis=-1, keepdims=True)
    return gamma * (x - mean) / (var + eps).sqrt() + beta`,
    },
    {
      path: "gelu.py",
      lang: "python",
      code: `def gelu(x):
    return 0.5 * x * (1 + torch.tanh(math.sqrt(2 / math.pi) * (x + 0.044715 * x ** 3)))`,
    },
    {
      path: "flash_attn.py",
      lang: "python",
      code: `def flash_attention(q, k, v, block=64):
    out = torch.zeros_like(q)
    for i in range(0, q.shape[0], block):
        qi = q[i : i + block]
        scores = qi @ k.T / math.sqrt(q.shape[-1])
        w = softmax(scores, dim=-1)
        out[i : i + block] = w @ v
    return out`,
    },
    {
      path: "rope.py",
      lang: "python",
      code: `def rope(x, freqs):
    x1, x2 = x[..., ::2], x[..., 1::2]
    return torch.stack((x1 * freqs - x2 * freqs, x1 * freqs + x2 * freqs), dim=-1)`,
    },
    {
      path: "kv_cache.py",
      lang: "python",
      code: `class KVCache:
    def __init__(self):
        self.k, self.v = [], []
    def append(self, k, v):
        self.k.append(k)
        self.v.append(v)`,
    },
    {
      path: "moe_router.py",
      lang: "python",
      code: `def route(x, experts, top_k=2):
    scores = x @ experts.gate.T
    vals, idx = scores.topk(top_k, dim=-1)
    weights = softmax(vals, dim=-1)
    return idx, weights`,
    },
    {
      path: "dist_allreduce.py",
      lang: "python",
      code: `def all_reduce(tensor, group):
    dist.all_reduce(tensor, op=dist.ReduceOp.SUM, group=group)
    tensor.div_(group.size())`,
    },
    {
      path: "tensor_parallel.py",
      lang: "python",
      code: `def column_parallel(x, weight, world):
    shard = weight.shape[0] // world
    start = rank * shard
    return x @ weight[start : start + shard].T`,
    },
    {
      path: "speculative_decode.py",
      lang: "python",
      code: `def speculative(draft, target, prompt, k=4):
    tokens = draft.generate(prompt, max_new=k)
    accept = target.verify(prompt, tokens)
    return accept if accept else target.generate(prompt, max_new=1)`,
    },
    {
      path: "quant_int8.py",
      lang: "python",
      code: `def quantize(w):
    scale = w.abs().max() / 127
    q = (w / scale).round().clamp(-128, 127).to(torch.int8)
    return q, scale`,
    },
    {
      path: "moe_load_balance.py",
      lang: "python",
      code: `def balance_loss(probs, tokens_per_expert):
    mean = tokens_per_expert.float().mean()
    var = tokens_per_expert.float().var()
    return var / (mean ** 2 + 1e-6)`,
    },
    {
      path: "checkpoint_shard.py",
      lang: "python",
      code: `def save_sharded(model, path, world):
    for name, tensor in model.state_dict().items():
        shard = tensor.chunk(world, dim=0)[rank]
        torch.save(shard, f"{path}/{name}.{rank}.pt")`,
    },
    {
      path: "eval_harness.py",
      lang: "python",
      code: `def run_eval(model, tasks):
    scores = {}
    for task in tasks:
        scores[task.name] = task.score(model)
    return scores`,
    },
    {
      path: "data_mix.py",
      lang: "python",
      code: `def sample_batch(sources, weights, batch):
    picks = random.choices(sources, weights=weights, k=batch)
    return [next(it) for it in picks]`,
    },
    {
      path: "loss_spike.py",
      lang: "python",
      code: `def skip_spike(loss, history, factor=3):
    if not history:
        return False
    return loss > factor * (sum(history) / len(history))`,
    },
    {
      path: "throughput.py",
      lang: "python",
      code: `def tokens_per_sec(tokens, elapsed, world):
    return tokens / elapsed * world`,
    },
  ],
}
