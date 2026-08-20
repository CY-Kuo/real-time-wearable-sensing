/*
  Origianl file:
  Simple WebSocket client for ArduinoHttpClient library
  Connects to the WebSocket server, and sends a hello
  message every 5 seconds

  created 28 Jun 2016
  by Sandeep Mistry
  modified 22 Jan 2019
  by Tom Igoe

  this example is in the public domain

  Modified for sensor data collection and display 
  by Chiaying Kuo
*/
#include <ArduinoHttpClient.h>
#include <WiFiNINA.h>
#include "arduino_secrets.h"
#include <MKRIMU.h>

///////please enter your sensitive data in the Secret tab/arduino_secrets.h
/////// WiFi Settings ///////
char ssid[] = SECRET_SSID;
//char username[] = SECRET_USER;
char pass[] = SECRET_PASS;

char serverAddress[] = "10.224.39.10"; //10.20.147.203"; // server address
int port = 80;

WiFiClient wifi;
WebSocketClient client = WebSocketClient(wifi, serverAddress, port);
int status = WL_IDLE_STATUS;
int count = 0; //number of collected data 
int data_number = 1000; //desired number of datasets
float Rref, Vin;
float s1, s2, s3; // variables for sensor resistance
float R1, R2, R3;
float x, y, z; // variables for acceleration


void setup() {
  Serial.begin(9600);
  
 
  while ( status != WL_CONNECTED) {
    Serial.print("Attempting to connect to Network named: ");
    Serial.println(ssid);                   // print the network name (SSID);

    // Connect to WPA/WPA2 network:
    status = WiFi.begin(ssid);
    //status = WiFi.beginEnterprise(ssid) ;
  }

  // print the SSID of the network you're attached to:
  Serial.print("SSID: ");
  Serial.println(WiFi.SSID());

  // print your WiFi shield's IP address:
  IPAddress ip = WiFi.localIP();
  Serial.print("IP Address: ");
  Serial.println(ip);

  if (!IMU.begin()) {
    //Serial.println("Failed to initialize IMU!");
    while (1);
  }
  Serial.print("Accelerometer sample rate = ");
  Serial.print(IMU.accelerationSampleRate());
  Serial.println(" Hz");
}

void loop() {
  Serial.println("starting WebSocket client");
  client.begin();

  while (client.connected()) {

      if (IMU.accelerationAvailable()) {
        IMU.readAcceleration(x, y, z);
      }

      Vin = 3300; //3.3V
      Rref = 440; //omh
      s1 = analogRead(A0)*Vin/1024 ; //3.22 mV
      s2 = analogRead(A1)*Vin/1024 ; 
      s3 = analogRead(A2)*Vin/1024 ;
      R1 = s1 * Rref / (Vin - s1);
      R2 = s2 * Rref / (Vin - s2);
      R3 = s3 * Rref / (Vin - s3);

      const unsigned long TIME = millis();
        // send data #
       client.beginMessage(TYPE_TEXT);
       //client.print("TIME:"); 
       client.println((String)"\r\n"+TIME);
       //client.print("SENSOR:");      
       //Serial.println("Successfully connected");
       client.println(R1);
       client.println(R2);
       client.println(R3);
       //client.print("ACCEL:");
       client.println(x);
       client.println(y);
       client.println(z);
       client.endMessage();

      // wait 0.1 seconds = 100 Hz
      delay(100);
    
  }
  //Serial.println("disconnected");
}
