from typing import TypedDict

from agents import function_tool


class TaskSplitJudgeResult(TypedDict):
    should_split: bool
    reason: str
    subtasks: list[str]


@function_tool()
async def task_split_judge_tool(user_request: str) -> TaskSplitJudgeResult:
    """
    ユーザーリクエストの内容から、タスク分割が必要かどうかを判定します。
    LLM判定ロジックをラップして呼び出します。
    """
    # LLM判定ロジックをラップ
    result = await llm_judge(user_request)
    return result

# LLM判定ロジック（実装はRunner/LLM API等に依存、ここはラッパー）
async def llm_judge(user_request: str) -> TaskSplitJudgeResult:
    """
    実際のLLM API/Runner等で判定を行う関数。
    ここはモック/ラッパーとして実装し、実際の判定は外部に委譲。
    """
    import json

    from openai import OpenAI
    from openai.types.chat import ChatCompletionMessageParam

    client = OpenAI()


    prompt = (
        f"ユーザーからのタスク: {user_request}\nタスクを分割すべきかどうかを判断してください。"
        f"結果はJSON形式: {{\"should_split\": boolean, \"reason\": string, \"subtasks\": list}}を返してください。"
    )
    messages: list[ChatCompletionMessageParam] = [
        {"role": "system", "content": "あなたはタスク分割の専門家です。ユーザーのタスク内容を解析して、タスクを分割すべきかどうかを判断し、必要に応じてサブタスクの提案を行います。"},
        {"role": "user", "content": prompt}
    ]
    try:
        response = client.chat.completions.create(
            model = "gpt-3.5-turbo",
            messages = messages,
            temperature = 0.0
        )
        completion = response.choices[0].message.content
        if completion is None:
            return {"should_split": False, "reason": "LLM response returned no content", "subtasks": []}
        result = json.loads(completion)
        if not all(key in result for key in ["should_split", "reason", "subtasks"]):
            return {"should_split": False, "reason": "不正なLLM応答", "subtasks": []}
        return result
    except Exception as e:
        return {"should_split": False, "reason": f"LLM呼び出し中のエラー: {e}", "subtasks": []}
