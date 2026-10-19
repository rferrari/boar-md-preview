# Field report: offline research on a phone

BOAR keeps a small AI and a library on your phone. This page is a **sample** for BOAR MD Preview: open it in the browser with the extension on and it reads like a document, not a wall of text.

## What was measured

| Phone | Model | First word | Speed | Sources |
|:--|:--|--:|--:|:-:|
| Poco X6 Pro | Qwen3 4B | 6.2 s | 7.2 tok/s | ✓ |
| POCO F3 | LFM2.5 1.2B | 2.9 s | 14.8 tok/s | ✓ |
| Pixel 7 | Gemma 4 E2B | 4.1 s | 11.3 tok/s | ✓ |

> [!NOTE]
> Every number comes with the phone and the date it was measured on.

## How to reproduce

1. Install the APK from the releases page.
2. Pick a model in setup, then turn on **airplane mode**.
3. Ask the questions from `eval/questions.jsonl`:

```bash
adb install boar.apk
npm run eval:device -- --phone x6pro
```

### Checklist

- [x] Works with the network off
- [x] Shows its sources
- [ ] Tested on GrapheneOS

> [!WARNING]
> A 1 GB model answers slower on phones with less than 6 GB of RAM.

## Notes

The receipt lists the model, time to first word, speed and memory.[^receipt] Read more in the [docs](https://boarapp.com/docs/).

[^receipt]: Shown under every answer when *Show technical details* is on.
