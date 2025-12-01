import socket
import sys
import errno
import json
import time
import random

PORT = 5050
# Uses the system's hostname, often resolves to 127.0.0.1 or the network IP
SERVER = '0.0.0.0' 
print(SERVER)
ADDR = (SERVER, PORT)
FORMAT = 'utf-8'
DISCONNECT_MESSAGE = "!DISCONNECT"


server = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
print("socket created")

server.bind(ADDR)    # bind this socket to the address we configured earlier
server.listen(2)
print(f"[LISTENING] Server is listening on {SERVER}")

# Loop to continuously accept connections
while True:
    try:
        conn, addr = server.accept() # Waits for the producer to connect
        print(f'CONNECTION FROM {addr} HAS BEEN ESTABLISHED')
        connected = True
        
        while connected:
            try:
                # Generates 5 data points
                for i in range(0,5):
                    route = ['Newyork,USA','Chennai, India','Bengaluru, India','London,UK']
                    routefrom = random.choice(route)
                    routeto = random.choice(route)
                    
                    if (routefrom != routeto):
                        data = {
                            "Battery_Level":round(random.uniform(2.00,5.00),2),
                            "Device_ID": random.randint(1150,1158),
                            "First_Sensor_temperature":round(random.uniform(10,40.0),1),
                            "Route_From":routefrom,
                            "Route_To":routeto
                            }
                        
                        # Serialize to JSON, encode, and **append a newline delimiter**
                        # Removed 'indent=1' to make the JSON compact and the delimiter reliable.
                        userdata = (json.dumps(data).encode(FORMAT) + b'\n') 
                        conn.sendall(userdata) # Use sendall for reliability
                        print(userdata)
                        time.sleep(10)
                    else:
                        continue

            except IOError as e:
                if e.errno == errno.EPIPE:
                    # Handle broken pipe error gracefully (client disconnected)
                    print("Client disconnected (Broken Pipe)")
                    connected = False
                else:
                    print(f"Server error: {e}")
                    raise
            except Exception as e:
                print(f"Unexpected error in data loop: {e}")
                connected = False

        if conn:
            conn.close()    #close the connection
            print(f"Connection with {addr} closed.")
            
    except KeyboardInterrupt:
        print("\nServer shutting down...")
        break
    except Exception as e:
        print(f"Error in server accept loop: {e}")
        time.sleep(5)

server.close()