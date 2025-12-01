"""
Database connection and collection management.
"""
from pymongo import MongoClient
from pymongo.errors import ConnectionFailure
from config import settings

# Collections
USERS_COLLECTION = "users"
SHIPMENT_DATA_COLLECTION = "shipment_data"
DEVICE_STREAM_DATA_COLLECTION = "device_stream_data"

class Database:
    _instance = None
    _client = None
    _db = None
    
    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(Database, cls).__new__(cls)
            cls._initialize()
        return cls._instance
    
    @classmethod
    def _initialize(cls):
        try:
            cls._client = MongoClient(settings.MONGODB_URI)
            cls._db = cls._client[settings.DATABASE_NAME]
            # Test the connection
            cls._client.admin.command('ping')
            print("Successfully connected to MongoDB.")
        except ConnectionFailure as e:
            print(f"Failed to connect to MongoDB: {e}")
            raise
    
    @classmethod
    def get_collection(cls, collection_name: str):
        if cls._db is None:
            raise RuntimeError("Database not initialized. Call Database() first.")
        return cls._db[collection_name]
    
    @classmethod
    def close_connection(cls):
        if cls._client:
            cls._client.close()
            cls._client = None
            cls._db = None

# Initialize the database connection when this module is imported
db = Database()