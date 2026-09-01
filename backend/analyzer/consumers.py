import json
from channels.generic.websocket import AsyncWebsocketConsumer

class BatchProgressConsumer(AsyncWebsocketConsumer):
    async def connect(self):
        self.batch_id = self.scope['url_route']['kwargs']['batch_id']
        self.group_name = f"batch_{self.batch_id}"

        # Join the group
        await self.channel_layer.group_add(
            self.group_name,
            self.channel_name
        )
        await self.accept()

    async def disconnect(self, close_code):
        # Leave the group
        await self.channel_layer.group_discard(
            self.group_name,
            self.channel_name
        )

    # Receive message from room group
    async def batch_progress(self, event):
        # Send message to WebSocket
        await self.send(text_data=json.dumps({
            'processed_files': event['processed_files'],
            'total_files': event['total_files'],
            'status': event['status']
        }))
