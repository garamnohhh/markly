# 마크를 코드로 그리기

마크는 심볼이 아니라 조판이다. 앱 안에서는 이미지를 쓰지 말고 아래 CSS로 그린다.
그래야 테마 전환·해상도·크기 변경에 그대로 따라온다.

실측 기준값 (JetBrains Mono 400, `line-height: 1`, em 단위):

```
m 잉크 좌변   0.066em
m 잉크 우변   0.534em
x-height 상단 0.300em
베이스라인    0.860em
```

---

## 1. 워드마크 — 인라인

```html
<span class="markly-wordmark">markly<i></i></span>
```

```css
.markly-wordmark {
  font-family: var(--font-mono);   /* JetBrains Mono */
  font-weight: 400;
  font-size: 15px;                 /* 인라인 하한 15px */
  letter-spacing: -0.02em;         /* 자간 사다리 참고 */
  line-height: 1;
  position: relative;
  display: inline-block;
  padding-right: 0.36em;           /* 점이 앉을 자리 */
}
.markly-wordmark > i {
  position: absolute;
  top: 0;
  right: 0;
  width: 0.27em;
  height: 0.27em;
  background: var(--accent);       /* #3ED49C */
}
```

전체 폭은 `padding-right` 포함 `3.75em`이다 (자간 -0.035em 기준).

### 자간 사다리

| font-size | letter-spacing | 전체 폭 |
|---|---|---|
| 44 | -0.035em | 3.75em |
| 24 | -0.03em | 3.78em |
| 15 | -0.02em | 3.84em |
| 타일 안 | -0.035em | 3.75em |

클 때 좁히고 작을 때 푼다. 타일 안에서는 크기와 무관하게 `-0.035em` 고정이다.

### 깜빡임

점은 **페이지당 하나만** 깜빡인다. 앱에서는 타이틀바의 워드마크 하나만 쓴다.

```css
.markly-wordmark--live > i { animation: markly-blink 1.06s steps(1, end) infinite; }
@keyframes markly-blink { 0%, 49% { opacity: 1 } 50%, 100% { opacity: 0 } }
@media (prefers-reduced-motion: reduce) {
  .markly-wordmark--live > i { animation: none }
}
```

---

## 2. 로고 타일 — 64px 이상

이름 전체를 정사각 타일에 넣는다. `font-size = 타일 × 0.192` → 콘텐츠가 타일 폭의 72%.

```css
.markly-tile {
  width: 64px; height: 64px;
  background: var(--text);
  display: flex; align-items: center; justify-content: center;
}
.markly-tile > .markly-wordmark {
  font-size: 12.29px;              /* 64 × 0.192 */
  letter-spacing: -0.035em;
  color: var(--bg);
}
```

| 타일 | font-size |
|---|---|
| 512 | 98.30 |
| 256 | 49.15 |
| 128 | 24.58 |
| 64 | 12.29 |

64px에서 x-height는 6.9px이다. 인라인 하한(15px)보다 작지만, 타일 안에서는
주변 텍스트와 경쟁하지 않아 읽힌다. 이것이 이름을 쓸 수 있는 하한이다.

---

## 3. 작은 마크 — 32px 이하

여섯 글자가 읽히지 않으므로 `m` 한 자와 점만 남긴다.
`x-height = 타일 / 4`, 즉 `font-size = 타일 / 2.24`.

```html
<span class="markly-mark"><b>m</b><i></i></span>
```

```css
.markly-mark {
  position: relative; display: block;
  font-size: 14.29px;                        /* 32 / 2.24 */
  width: calc(0.468em + 3px);                /* 3px = 점 크기 */
  height: calc(0.560em + 3px);
}
.markly-mark > b {
  position: absolute;
  left: -0.066em;
  top: calc(3px - 0.300em);
  font-family: var(--font-mono); font-weight: 400;
  font-size: 1em; line-height: 1;
  color: var(--bg);
}
.markly-mark > i {
  position: absolute;
  left: 0.468em;                             /* = m 잉크 우변 */
  top: 0;
  width: 3px; height: 3px;
  background: var(--accent);
}
```

| 타일 | font-size | x-height | 점 |
|---|---|---|---|
| 32 | 14.29 | 8px | 3px |
| 16 | 7.14 | 4px | 2px |

### 점 위치 규칙

점의 **좌하단 꼭짓점**이 두 선의 교차점에 놓인다 — 가로선은 m의 x-height 상단,
세로선은 m의 오른쪽 잉크 변. 점은 m의 오른쪽 위 꼭짓점과 대각으로 맞닿고 간격은 0이다.
위 CSS의 `left: 0.468em` / `top: calc(dot - 0.300em)`이 그 좌표다.

점 크기는 **정수 픽셀로 스냅하고 2px을 하한**으로 둔다. em으로 두면 32에서 5.2px,
16에서 2.5px처럼 반픽셀에 걸려 뭉갠다.

---

## 4. 사이즈 사다리

| 크기 | 마크 |
|---|---|
| 64px 이상 | 이름 전체 — `markly` + 점 |
| 32 · 16px | 글자 하나 — `m` + 점 |

---

## 5. 금지

- 대문자로 쓰지 않는다. `Markly`, `MARKLY` 모두 틀렸다.
- 다른 서체로 조판하지 않는다.
- 점을 원형으로 바꾸지 않는다. 정사각만 쓴다.
- 점 색을 액센트 외의 색으로 바꾸지 않는다.
- 기울이거나 굵기를 바꾸지 않는다.
- 그림자, 그라디언트, 둥근 모서리를 더하지 않는다.
- 이름과 점 사이에 다른 요소를 넣지 않는다.
- 타일 여백을 줄여 꽉 채우지 않는다.
