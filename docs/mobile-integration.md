# Mobile Integration Guide

## Overview

The AI Runtime Sandbox features a mobile-first responsive design with collapsible containers and touch-optimized interfaces. This guide shows how to integrate with mobile platforms.

## Mobile Web Interface

### Responsive Design Features

- **Collapsible File Explorer**: Slides out from left on mobile
- **Collapsible System Monitor**: Slides out from right on mobile  
- **Touch-Optimized Tabs**: Scrollable tab interface for small screens
- **Adaptive Terminal**: Collapsible terminal for split-screen coding
- **Mobile Navigation**: Hamburger menu with essential controls

### Screen Size Breakpoints

```css
/* Mobile First Approach */
.container {
  /* Base mobile styles */
  padding: 0.5rem;
}

@media (min-width: 640px) {
  /* Small tablets and up */
  .container {
    padding: 1rem;
  }
}

@media (min-width: 1024px) {
  /* Desktop and up */
  .container {
    padding: 1.5rem;
  }
}
```

## React Native Integration

### Installation

```bash
npm install react-native-webview
npm install @react-native-async-storage/async-storage
```

### Basic Implementation

```typescript
import React from 'react';
import { WebView } from 'react-native-webview';
import { View, StyleSheet } from 'react-native';

export default function SandboxScreen() {
  const injectedJavaScript = `
    // Optimize for mobile
    document.body.style.userSelect = 'none';
    document.body.style.webkitUserSelect = 'none';
    document.body.style.webkitTouchCallout = 'none';
    
    // Add mobile gestures
    let touchStartX = 0;
    let touchStartY = 0;
    
    document.addEventListener('touchstart', (e) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    });
    
    document.addEventListener('touchend', (e) => {
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;
      
      // Swipe right to open file explorer
      if (deltaX > 100 && Math.abs(deltaY) < 50) {
        window.postMessage({type: 'swipe-right'});
      }
      
      // Swipe left to open system monitor
      if (deltaX < -100 && Math.abs(deltaY) < 50) {
        window.postMessage({type: 'swipe-left'});
      }
    });
  `;

  const handleMessage = (event: any) => {
    const data = JSON.parse(event.nativeEvent.data);
    
    switch (data.type) {
      case 'swipe-right':
        // Handle file explorer open
        break;
      case 'swipe-left':
        // Handle system monitor open
        break;
    }
  };

  return (
    <View style={styles.container}>
      <WebView
        source={{ uri: 'http://your-sandbox-url.com' }}
        injectedJavaScript={injectedJavaScript}
        onMessage={handleMessage}
        style={styles.webview}
        allowsInlineMediaPlayback
        mediaPlaybackRequiresUserAction={false}
        scalesPageToFit={false}
        scrollEnabled={true}
        bounces={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#1e1e1e',
  },
  webview: {
    flex: 1,
  },
});
```

## Flutter Integration

### Dependencies

```yaml
dependencies:
  flutter:
    sdk: flutter
  webview_flutter: ^4.4.2
  web_socket_channel: ^2.4.0
  http: ^1.1.0
```

### Implementation

```dart
import 'package:flutter/material.dart';
import 'package:webview_flutter/webview_flutter.dart';
import 'package:web_socket_channel/web_socket_channel.dart';
import 'package:http/http.dart' as http;
import 'dart:convert';

class SandboxScreen extends StatefulWidget {
  @override
  _SandboxScreenState createState() => _SandboxScreenState();
}

class _SandboxScreenState extends State<SandboxScreen> {
  late WebViewController controller;
  WebSocketChannel? channel;
  String? sessionId;

  @override
  void initState() {
    super.initState();
    initializeController();
    createSession();
  }

  void initializeController() {
    controller = WebViewController()
      ..setJavaScriptMode(JavaScriptMode.unrestricted)
      ..setNavigationDelegate(
        NavigationDelegate(
          onPageFinished: (url) {
            // Inject mobile optimization
            controller.runJavaScript('''
              // Enable mobile scrolling
              document.body.style.overflow = 'auto';
              document.body.style.webkitOverflowScrolling = 'touch';
              
              // Add touch feedback
              const style = document.createElement('style');
              style.textContent = `
                * {
                  -webkit-tap-highlight-color: rgba(0,0,0,0.1);
                }
                button:active, .clickable:active {
                  transform: scale(0.95);
                  transition: transform 0.1s;
                }
              `;
              document.head.appendChild(style);
            ''');
          },
        ),
      )
      ..loadRequest(Uri.parse('http://your-sandbox-url.com'));
  }

  Future<void> createSession() async {
    try {
      final response = await http.post(
        Uri.parse('http://your-api-url.com/api/sessions'),
        headers: {'Content-Type': 'application/json'},
        body: json.encode({'status': 'active'}),
      );
      
      if (response.statusCode == 200) {
        final data = json.decode(response.body);
        sessionId = data['id'];
        connectWebSocket();
      }
    } catch (e) {
      print('Error creating session: $e');
    }
  }

  void connectWebSocket() {
    if (sessionId != null) {
      channel = WebSocketChannel.connect(
        Uri.parse('ws://your-api-url.com/ws?sessionId=$sessionId'),
      );
      
      channel?.stream.listen((message) {
        final data = json.decode(message);
        // Handle terminal data, system stats, etc.
        handleWebSocketMessage(data);
      });
    }
  }

  void handleWebSocketMessage(Map<String, dynamic> data) {
    switch (data['type']) {
      case 'terminal:data':
        // Update terminal UI
        break;
      case 'system:stats':
        // Update system monitor
        break;
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('AI Sandbox'),
        backgroundColor: Color(0xFF1e1e1e),
        elevation: 0,
        actions: [
          IconButton(
            icon: Icon(Icons.folder_open),
            onPressed: () {
              // Trigger file explorer
              controller.runJavaScript(
                "document.querySelector('[data-mobile-file-explorer]').click();"
              );
            },
          ),
          IconButton(
            icon: Icon(Icons.monitor),
            onPressed: () {
              // Trigger system monitor
              controller.runJavaScript(
                "document.querySelector('[data-mobile-system-monitor]').click();"
              );
            },
          ),
        ],
      ),
      body: WebViewWidget(controller: controller),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          // Quick terminal toggle
          controller.runJavaScript(
            "document.querySelector('[data-terminal-toggle]').click();"
          );
        },
        child: Icon(Icons.terminal),
        backgroundColor: Color(0xFF2472c8),
      ),
    );
  }

  @override
  void dispose() {
    channel?.sink.close();
    super.dispose();
  }
}
```

## iOS Native Integration

### Swift Implementation

```swift
import UIKit
import WebKit

class SandboxViewController: UIViewController {
    private var webView: WKWebView!
    private var urlSession: URLSession!
    private var webSocketTask: URLSessionWebSocketTask?
    private var sessionId: String?
    
    override func viewDidLoad() {
        super.viewDidLoad()
        setupWebView()
        setupSession()
    }
    
    private func setupWebView() {
        let configuration = WKWebViewConfiguration()
        configuration.allowsInlineMediaPlayback = true
        configuration.mediaTypesRequiringUserActionForPlayback = []
        
        webView = WKWebView(frame: view.bounds, configuration: configuration)
        webView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        webView.navigationDelegate = self
        webView.uiDelegate = self
        
        view.addSubview(webView)
        
        // Add mobile optimization
        let script = """
            // Mobile viewport optimization
            const viewport = document.querySelector('meta[name=viewport]');
            if (viewport) {
                viewport.setAttribute('content', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no');
            }
            
            // Touch optimization
            document.body.style.webkitUserSelect = 'none';
            document.body.style.webkitTouchCallout = 'none';
            
            // Add iOS-specific styles
            const style = document.createElement('style');
            style.textContent = `
                body {
                    -webkit-overflow-scrolling: touch;
                }
                .mobile-hidden {
                    display: none !important;
                }
                @media (max-width: 640px) {
                    .desktop-only {
                        display: none !important;
                    }
                }
            `;
            document.head.appendChild(style);
        """
        
        let userScript = WKUserScript(source: script, injectionTime: .atDocumentEnd, forMainFrameOnly: false)
        webView.configuration.userContentController.addUserScript(userScript)
        
        if let url = URL(string: "http://your-sandbox-url.com") {
            webView.load(URLRequest(url: url))
        }
    }
    
    private func setupSession() {
        guard let url = URL(string: "http://your-api-url.com/api/sessions") else { return }
        
        var request = URLRequest(url: url)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        
        let body = ["status": "active"]
        request.httpBody = try? JSONSerialization.data(withJSONObject: body)
        
        URLSession.shared.dataTask(with: request) { [weak self] data, response, error in
            guard let data = data,
                  let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
                  let sessionId = json["id"] as? String else { return }
            
            self?.sessionId = sessionId
            self?.connectWebSocket()
        }.resume()
    }
    
    private func connectWebSocket() {
        guard let sessionId = sessionId,
              let url = URL(string: "ws://your-api-url.com/ws?sessionId=\(sessionId)") else { return }
        
        webSocketTask = URLSession.shared.webSocketTask(with: url)
        webSocketTask?.resume()
        
        receiveMessage()
    }
    
    private func receiveMessage() {
        webSocketTask?.receive { [weak self] result in
            switch result {
            case .success(let message):
                switch message {
                case .string(let text):
                    self?.handleWebSocketMessage(text)
                case .data(let data):
                    if let text = String(data: data, encoding: .utf8) {
                        self?.handleWebSocketMessage(text)
                    }
                @unknown default:
                    break
                }
                self?.receiveMessage()
            case .failure(let error):
                print("WebSocket error: \(error)")
            }
        }
    }
    
    private func handleWebSocketMessage(_ message: String) {
        guard let data = message.data(using: .utf8),
              let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any],
              let type = json["type"] as? String else { return }
        
        DispatchQueue.main.async { [weak self] in
            switch type {
            case "terminal:data":
                // Handle terminal output
                break
            case "system:stats":
                // Handle system stats
                break
            default:
                break
            }
        }
    }
}

extension SandboxViewController: WKNavigationDelegate, WKUIDelegate {
    func webView(_ webView: WKWebView, didFinish navigation: WKNavigation!) {
        // Inject mobile-specific JavaScript
        let mobileJS = """
            // Add swipe gestures
            let startX = 0;
            document.addEventListener('touchstart', (e) => {
                startX = e.touches[0].clientX;
            });
            
            document.addEventListener('touchend', (e) => {
                const endX = e.changedTouches[0].clientX;
                const diff = endX - startX;
                
                if (diff > 100) {
                    // Swipe right - open file explorer
                    const fileExplorerBtn = document.querySelector('[data-mobile-file-explorer]');
                    if (fileExplorerBtn) fileExplorerBtn.click();
                } else if (diff < -100) {
                    // Swipe left - open system monitor
                    const systemMonitorBtn = document.querySelector('[data-mobile-system-monitor]');
                    if (systemMonitorBtn) systemMonitorBtn.click();
                }
            });
        """
        
        webView.evaluateJavaScript(mobileJS)
    }
}
```

## Android Native Integration

### Kotlin Implementation

```kotlin
import android.os.Bundle
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import okhttp3.*
import okhttp3.MediaType.Companion.toMediaType
import okhttp3.RequestBody.Companion.toRequestBody
import org.json.JSONObject
import java.io.IOException

class SandboxActivity : AppCompatActivity() {
    private lateinit var webView: WebView
    private lateinit var client: OkHttpClient
    private var webSocket: WebSocket? = null
    private var sessionId: String? = null

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        
        setupWebView()
        setupHttpClient()
        createSession()
    }

    private fun setupWebView() {
        webView = WebView(this)
        setContentView(webView)
        
        webView.settings.apply {
            javaScriptEnabled = true
            domStorageEnabled = true
            allowFileAccess = true
            allowContentAccess = true
            setSupportZoom(true)
            builtInZoomControls = true
            displayZoomControls = false
        }
        
        webView.webViewClient = object : WebViewClient() {
            override fun onPageFinished(view: WebView?, url: String?) {
                super.onPageFinished(view, url)
                
                // Inject Android-specific optimizations
                val androidJS = """
                    // Android viewport optimization
                    const viewport = document.querySelector('meta[name=viewport]');
                    if (!viewport) {
                        const meta = document.createElement('meta');
                        meta.name = 'viewport';
                        meta.content = 'width=device-width, initial-scale=1.0, user-scalable=no';
                        document.head.appendChild(meta);
                    }
                    
                    // Touch optimization for Android
                    document.body.style.touchAction = 'manipulation';
                    document.body.style.webkitUserSelect = 'none';
                    
                    // Add Android-specific styles
                    const style = document.createElement('style');
                    style.textContent = `
                        * {
                            -webkit-tap-highlight-color: rgba(0,0,0,0.1);
                        }
                        button {
                            min-height: 44px;
                            min-width: 44px;
                        }
                        input, textarea {
                            font-size: 16px; /* Prevent zoom on focus */
                        }
                    `;
                    document.head.appendChild(style);
                    
                    // Add gesture support
                    let touchStart = { x: 0, y: 0 };
                    document.addEventListener('touchstart', (e) => {
                        touchStart.x = e.touches[0].clientX;
                        touchStart.y = e.touches[0].clientY;
                    });
                    
                    document.addEventListener('touchend', (e) => {
                        const touchEnd = {
                            x: e.changedTouches[0].clientX,
                            y: e.changedTouches[0].clientY
                        };
                        
                        const deltaX = touchEnd.x - touchStart.x;
                        const deltaY = touchEnd.y - touchStart.y;
                        
                        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 100) {
                            if (deltaX > 0) {
                                // Swipe right
                                Android.onSwipeRight();
                            } else {
                                // Swipe left
                                Android.onSwipeLeft();
                            }
                        }
                    });
                """.trimIndent()
                
                webView.evaluateJavascript(androidJS, null)
            }
        }
        
        // Add JavaScript interface for native communication
        webView.addJavascriptInterface(AndroidInterface(), "Android")
        
        webView.loadUrl("http://your-sandbox-url.com")
    }
    
    private fun setupHttpClient() {
        client = OkHttpClient()
    }
    
    private fun createSession() {
        val json = JSONObject().apply {
            put("status", "active")
        }
        
        val body = json.toString().toRequestBody("application/json".toMediaType())
        val request = Request.Builder()
            .url("http://your-api-url.com/api/sessions")
            .post(body)
            .build()
        
        client.newCall(request).enqueue(object : Callback {
            override fun onFailure(call: Call, e: IOException) {
                e.printStackTrace()
            }
            
            override fun onResponse(call: Call, response: Response) {
                response.body?.string()?.let { responseBody ->
                    val json = JSONObject(responseBody)
                    sessionId = json.getString("id")
                    connectWebSocket()
                }
            }
        })
    }
    
    private fun connectWebSocket() {
        sessionId?.let { id ->
            val request = Request.Builder()
                .url("ws://your-api-url.com/ws?sessionId=$id")
                .build()
            
            webSocket = client.newWebSocket(request, object : WebSocketListener() {
                override fun onMessage(webSocket: WebSocket, text: String) {
                    val json = JSONObject(text)
                    val type = json.getString("type")
                    
                    runOnUiThread {
                        when (type) {
                            "terminal:data" -> {
                                // Handle terminal data
                            }
                            "system:stats" -> {
                                // Handle system stats
                            }
                        }
                    }
                }
                
                override fun onFailure(webSocket: WebSocket, t: Throwable, response: Response?) {
                    t.printStackTrace()
                }
            })
        }
    }
    
    inner class AndroidInterface {
        @android.webkit.JavascriptInterface
        fun onSwipeRight() {
            runOnUiThread {
                // Handle swipe right - open file explorer
                webView.evaluateJavascript(
                    "document.querySelector('[data-mobile-file-explorer]')?.click()",
                    null
                )
            }
        }
        
        @android.webkit.JavascriptInterface
        fun onSwipeLeft() {
            runOnUiThread {
                // Handle swipe left - open system monitor
                webView.evaluateJavascript(
                    "document.querySelector('[data-mobile-system-monitor]')?.click()",
                    null
                )
            }
        }
    }
    
    override fun onDestroy() {
        super.onDestroy()
        webSocket?.close(1000, "Activity destroyed")
    }
}
```

## Progressive Web App (PWA) Configuration

### Manifest File

```json
{
  "name": "AI Runtime Sandbox",
  "short_name": "AI Sandbox",
  "description": "Powerful runtime sandbox environment for AI agents",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#1e1e1e",
  "theme_color": "#2472c8",
  "orientation": "any",
  "icons": [
    {
      "src": "/icons/icon-192.png",
      "sizes": "192x192",
      "type": "image/png"
    },
    {
      "src": "/icons/icon-512.png",
      "sizes": "512x512",
      "type": "image/png"
    }
  ],
  "categories": ["developer", "productivity"],
  "screenshots": [
    {
      "src": "/screenshots/desktop.png",
      "sizes": "1280x720",
      "type": "image/png",
      "form_factor": "wide"
    },
    {
      "src": "/screenshots/mobile.png",
      "sizes": "375x667",
      "type": "image/png",
      "form_factor": "narrow"
    }
  ]
}
```

### Service Worker

```javascript
const CACHE_NAME = 'ai-sandbox-v1';
const urlsToCache = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json'
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(urlsToCache))
  );
});

self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request)
      .then((response) => {
        if (response) {
          return response;
        }
        return fetch(event.request);
      }
    )
  );
});
```

This comprehensive mobile integration guide enables seamless deployment across all mobile platforms while maintaining the full functionality of the AI Runtime Sandbox.