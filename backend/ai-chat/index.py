import json
import os
import urllib.request
import urllib.error


def handler(event: dict, context) -> dict:
    '''
    ИИ-ассистент на базе ChatGPT (OpenAI).
    Принимает историю сообщений и возвращает ответ модели.
    '''
    method = event.get('httpMethod', 'GET')

    cors = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '86400',
    }

    if method == 'OPTIONS':
        return {'statusCode': 200, 'headers': cors, 'body': ''}

    if method != 'POST':
        return {'statusCode': 405, 'headers': {**cors, 'Content-Type': 'application/json'},
                'body': json.dumps({'error': 'Method not allowed'})}

    api_key = os.environ.get('OPENAI_API_KEY', '').strip()
    if not api_key:
        return {'statusCode': 200, 'headers': {**cors, 'Content-Type': 'application/json'},
                'body': json.dumps({'reply': 'ИИ-ассистент ещё не настроен: администратору нужно добавить ключ OpenAI.', 'configured': False}, ensure_ascii=False)}

    try:
        body = json.loads(event.get('body') or '{}')
    except Exception:
        body = {}

    user_messages = body.get('messages') or []
    system_prompt = body.get('system') or (
        'Ты — ИИ-ассистент корпоративной платформы «Мобильный инспектор». '
        'Помогаешь сотрудникам с вопросами по документам, чек-листам, охране труда, '
        'промышленной безопасности и работе в приложении. Отвечай кратко и по делу на русском языке.'
    )

    chat = [{'role': 'system', 'content': system_prompt}]
    for m in user_messages[-12:]:
        role = m.get('role')
        role = 'assistant' if role in ('bot', 'assistant') else 'user'
        text = str(m.get('text') or m.get('content') or '').strip()
        if text:
            chat.append({'role': role, 'content': text})

    payload = json.dumps({
        'model': 'gpt-4o-mini',
        'messages': chat,
        'temperature': 0.6,
        'max_tokens': 600,
    }).encode('utf-8')

    req = urllib.request.Request(
        'https://api.openai.com/v1/chat/completions',
        data=payload,
        headers={'Content-Type': 'application/json', 'Authorization': f'Bearer {api_key}'},
        method='POST',
    )

    try:
        with urllib.request.urlopen(req, timeout=25) as resp:
            data = json.loads(resp.read().decode('utf-8'))
        reply = data['choices'][0]['message']['content'].strip()
        return {'statusCode': 200, 'headers': {**cors, 'Content-Type': 'application/json'},
                'body': json.dumps({'reply': reply, 'configured': True}, ensure_ascii=False)}
    except urllib.error.HTTPError as e:
        detail = e.read().decode('utf-8', 'ignore')
        return {'statusCode': 200, 'headers': {**cors, 'Content-Type': 'application/json'},
                'body': json.dumps({'reply': 'Не удалось получить ответ от ИИ. Проверьте ключ OpenAI и баланс.', 'configured': True, 'error': detail[:300]}, ensure_ascii=False)}
    except Exception as e:
        return {'statusCode': 200, 'headers': {**cors, 'Content-Type': 'application/json'},
                'body': json.dumps({'reply': 'Сервис ИИ временно недоступен, попробуйте позже.', 'configured': True, 'error': str(e)[:200]}, ensure_ascii=False)}
