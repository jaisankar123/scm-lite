import json
import logging
import signal
import sys
from kafka import KafkaConsumer
from kafka.errors import KafkaError, NoBrokersAvailable
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure, PyMongoError
from time import sleep



# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('consumer.log')
    ]
)
log_processor = logging.getLogger(__name__)

# Configuration Constants
KAFKA_SERVER_ADDRESSES = ['localhost:9092']
KAFKA_INPUT_TOPIC = 'device_stream_data'

MONGO_CONNECTION_URI = 'mongodb+srv://jaisankarnb66:jaisankarnoob@scmjai.hhh5gt5.mongodb.net/?appName=scmjai'
MONGODB_DATABASE_NAME = 'scmlitedb'
MONGODB_COLLECTION_NAME = 'device_stream_data'

class KafkaMongoDataPipeline:
    def __init__(self):
        self.kafka_message_consumer = None
        self.mongo_database_client = None
        self.target_collection = None
        self.is_running = True
        
        # Setup signal handlers for graceful shutdown
        signal.signal(signal.SIGINT, self._handle_shutdown_signal)
        signal.signal(signal.SIGTERM, self._handle_shutdown_signal)
        
        self._initialize_kafka_consumer()
        self._initialize_mongodb_connection()

    def _initialize_kafka_consumer(self, maximum_retries=5, retry_interval_seconds=5):
        """Initialize Kafka consumer with retry logic."""
        attempt_count = 0
        while attempt_count < maximum_retries:
            try:
                self.kafka_message_consumer = KafkaConsumer(
                    KAFKA_INPUT_TOPIC,
                    bootstrap_servers=KAFKA_SERVER_ADDRESSES,
                    value_deserializer=lambda x: self._safely_parse_json(x),
                    auto_offset_reset='earliest',
                    enable_auto_commit=True,
                    group_id='shipment_consumer_group'
                )
                log_processor.info("Successfully connected to Kafka")
                return
            except NoBrokersAvailable:
                attempt_count += 1
                if attempt_count == maximum_retries:
                    log_processor.error("Failed to connect to Kafka after multiple attempts")
                    raise
                log_processor.warning(f"Kafka broker not available. Retrying in {retry_interval_seconds} seconds... (Attempt {attempt_count}/{maximum_retries})")
                sleep(retry_interval_seconds)
            except Exception as initialization_error:
                log_processor.error(f"Error setting up Kafka consumer: {initialization_error}")
                raise

    def _initialize_mongodb_connection(self, maximum_retries=5, retry_interval_seconds=5):
        """Initialize MongoDB connection with retry logic."""
        attempt_count = 0
        while attempt_count < maximum_retries:
            try:
                self.mongo_database_client = MongoClient(
                    MONGO_CONNECTION_URI,
                    serverSelectionTimeoutMS=5000,
                    connectTimeoutMS=30000,
                    socketTimeoutMS=None,
                    connect=False,
                    maxPoolsize=1
                )
                # Force connection to verify it works
                self.mongo_database_client.server_info()
                database_instance = self.mongo_database_client[MONGODB_DATABASE_NAME]
                self.target_collection = database_instance[MONGODB_COLLECTION_NAME]
                log_processor.info(f"Successfully connected to MongoDB. Database: {MONGODB_DATABASE_NAME}, Collection: {MONGODB_COLLECTION_NAME}")
                return
            except ConnectionFailure as connection_error:
                attempt_count += 1
                if attempt_count == maximum_retries:
                    log_processor.error("Failed to connect to MongoDB after multiple attempts")
                    raise
                log_processor.warning(f"MongoDB connection failed. Retrying in {retry_interval_seconds} seconds... (Attempt {attempt_count}/{maximum_retries})")
                sleep(retry_interval_seconds)
            except Exception as initialization_error:
                log_processor.error(f"Error setting up MongoDB: {initialization_error}")
                raise

    @staticmethod
    def _safely_parse_json(json_bytes_data):
        """Safely deserialize JSON string."""
        try:
            return json.loads(json_bytes_data)
        except json.JSONDecodeError as json_error:
            log_processor.warning(f"Invalid JSON received: {json_bytes_data}. Error: {json_error}")
            return None

    def _process_message_and_store(self, incoming_message):
        """Process a single message and insert into MongoDB."""
        if not incoming_message.value:
            log_processor.warning("Received empty or invalid message")
            return

        try:
            # Data is the deserialized JSON dictionary
            message_data = incoming_message.value
            if not isinstance(message_data, dict):
                log_processor.warning(f"Unexpected message format: {message_data}")
                return
                
            # Insert into MongoDB
            insert_result = self.target_collection.insert_one(message_data)
            log_processor.info(f"Inserted document with ID: {insert_result.inserted_id}")
            
        except PyMongoError as mongo_operation_error:
            log_processor.error(f"MongoDB error during insertion: {mongo_operation_error}")
        except Exception as unexpected_error:
            log_processor.error(f"Error processing message: {unexpected_error}")

    def _handle_shutdown_signal(self, signal_number, frame):
        """Handle shutdown signals."""
        log_processor.info("Shutdown signal received. Closing connections...")
        self.is_running = False
        self.cleanup_connections()
        sys.exit(0)

    def cleanup_connections(self):
        """Close all connections."""
        if self.kafka_message_consumer:
            try:
                self.kafka_message_consumer.close()
                log_processor.info("Kafka consumer closed")
            except Exception as kafka_close_error:
                log_processor.error(f"Error closing Kafka consumer: {kafka_close_error}")
        
        if self.mongo_database_client:
            try:
                self.mongo_database_client.close()
                log_processor.info("MongoDB connection closed")
            except Exception as mongo_close_error:
                log_processor.error(f"Error closing MongoDB connection: {mongo_close_error}")

    def start_pipeline(self):
        """Main consumer loop."""
        log_processor.info("Starting Kafka consumer...")
        
        try:
            for message in self.kafka_message_consumer:
                if not self.is_running:
                    break
                    
                log_processor.debug(f"Received message: {message.value}")
                self._process_message_and_store(message)
                
        except KafkaError as kafka_runtime_error:
            log_processor.error(f"Kafka runtime error: {kafka_runtime_error}")
        except Exception as general_runtime_error:
            log_processor.error(f"Unexpected error: {general_runtime_error}")
        finally:
            self.cleanup_connections()

def run_main_application():
    application_instance = None
    while True:
        try:
            application_instance = KafkaMongoDataPipeline()
            application_instance.start_pipeline()
        except KeyboardInterrupt:
            log_processor.info("Shutdown requested. Exiting...")
            if application_instance:
                application_instance.cleanup_connections()
            break
        except Exception as pipeline_failure_error:
            log_processor.error(f"Consumer pipeline failed: {pipeline_failure_error}")
            log_processor.info("Restarting consumer in 10 seconds...")
            sleep(10)

if __name__ == "__main__":
    run_main_application()