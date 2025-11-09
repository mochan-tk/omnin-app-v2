import os
import smtplib
import ssl
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

from agents import function_tool


@function_tool()
async def send_gmail_tool(
    subject: str,
    to: str,
    body: str,
    cc: Optional[str] = None,
    bcc: Optional[str] = None
) -> str:
    """
    Gmailを使用してメールを送信します。件名、宛先、CC、BCC、本文を指定できます。
    
    Args:
        subject: メールの件名
        to: 宛先のメールアドレス（複数の場合はカンマ区切り）
        body: メールの本文
        cc: CCのメールアドレス（複数の場合はカンマ区切り）
        bcc: BCCのメールアドレス（複数の場合はカンマ区切り）
    
    Returns:
        str: 送信結果のJSON文字列
    """
    try:
        # 環境変数からGmail認証情報を取得
        smtp_server = "smtp.gmail.com"
        smtp_port = 587
        sender_email = os.getenv("GMAIL_USER")
        sender_password = os.getenv("GMAIL_APP_PASSWORD")  # アプリパスワードを使用
        
        if not sender_email or not sender_password:
            result = {
                "status": "error",
                "message": "Gmail認証情報が設定されていません。GMAIL_USERとGMAIL_APP_PASSWORDの環境変数を設定してください。",
                "success": False
            }
            import json
            return json.dumps(result, ensure_ascii=False)
        
        # メッセージの作成
        message = MIMEMultipart()
        message["From"] = sender_email
        message["Subject"] = subject
        
        # 宛先の設定
        to_addresses = [addr.strip() for addr in to.split(",") if addr.strip()]
        message["To"] = ", ".join(to_addresses)
        
        # CCの設定
        cc_addresses = []
        if cc:
            cc_addresses = [addr.strip() for addr in cc.split(",") if addr.strip()]
            message["Cc"] = ", ".join(cc_addresses)
        
        # BCCの設定（ヘッダーには表示されない）
        bcc_addresses = []
        if bcc:
            bcc_addresses = [addr.strip() for addr in bcc.split(",") if addr.strip()]
        
        # 本文の追加
        message.attach(MIMEText(body, "plain", "utf-8"))
        
        # 全ての受信者のリスト
        all_recipients = to_addresses + cc_addresses + bcc_addresses
        
        # SMTP接続とメール送信
        context = ssl.create_default_context()
        with smtplib.SMTP(smtp_server, smtp_port) as server:
            server.starttls(context=context)
            server.login(sender_email, sender_password)
            server.sendmail(sender_email, all_recipients, message.as_string())
        
        result = {
            "status": "success",
            "message": f"メールが正常に送信されました。宛先: {len(all_recipients)}件",
            "success": True,
            "details": {
                "to_count": len(to_addresses),
                "cc_count": len(cc_addresses),
                "bcc_count": len(bcc_addresses),
                "subject": subject
            }
        }
        
    except smtplib.SMTPAuthenticationError:
        result = {
            "status": "error",
            "message": "Gmail認証に失敗しました。メールアドレスとアプリパスワードを確認してください。",
            "success": False
        }
    except smtplib.SMTPRecipientsRefused as e:
        result = {
            "status": "error",
            "message": f"受信者のメールアドレスが拒否されました: {str(e)}",
            "success": False
        }
    except smtplib.SMTPException as e:
        result = {
            "status": "error",
            "message": f"SMTP送信エラー: {str(e)}",
            "success": False
        }
    except Exception as e:
        result = {
            "status": "error",
            "message": f"予期しないエラーが発生しました: {str(e)}",
            "success": False
        }
    
    import json
    return json.dumps(result, ensure_ascii=False)