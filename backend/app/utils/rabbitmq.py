import pika
import json
import threading

def publish_alert(queue_name: str, message: dict):
    """
    Mock/Graceful implementation to publish message to RabbitMQ without crashing local dev environment.
    """
    def _publish():
        try:
            connection = pika.BlockingConnection(pika.ConnectionParameters(host='localhost'))
            channel = connection.channel()
            channel.queue_declare(queue=queue_name, durable=True)
            channel.basic_publish(
                exchange='',
                routing_key=queue_name,
                body=json.dumps(message),
                properties=pika.BasicProperties(
                    delivery_mode=2,  # make message persistent
                ))
            connection.close()
            print(f" [x] Sent alert to {queue_name}: {message}")
        except Exception as e:
            # Swallow connection errors if no local RabbitMQ is spinning so logic doesn't crash test systems
            print(f"RabbitMQ connection warning: {e}")
            
    # Run async to not block API requests
    thread = threading.Thread(target=_publish)
    thread.start()

def save_notification(db, user_id: str, message: str, notif_type: str):
    """Save notification directly to PostgreSQL (reliable fallback)."""
    from app.models.notification import Notification
    from app.utils.id_generator import generate_next_id

    new_id = generate_next_id(db, Notification, "13")
    notif = Notification(
        id=new_id,
        user_id=user_id,
        message=message,
        type=notif_type,
        is_read=False
    )
    db.add(notif)
    # Note: caller is responsible for db.commit()
