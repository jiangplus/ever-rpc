

const JSONRPC = require("jsonrpc-bidirectional");
const WebSocket = require("ws");
const WebSocketServer = WebSocket.Server;

class TestEndpoint extends JSONRPC.EndpointBase 
{
  constructor()
  {
    super(
      /*strName*/ "Test", 
      /*strPath*/ "/api", 
      /*objReflection*/ {}, // Reserved for future use.
      /*classReverseCallsClient*/ JSONRPC.Client // This may be left undefined
    );

    // The class reference classReverseCallsClient must be specified to enable bidirectional JSON-RPC over a single WebSocket connection.
    // If may be left undefined for one-way interrogation.
    // It must contain a reference to a subclass of JSONRPC.Client or a reference to the JSONRPC.Client class itself.
  }

  async ping(incomingRequest, strReturn, bThrow)
  {
    if(bThrow)
    {
      throw new JSONRPC.Exception("You asked me to throw.");
    }

    // If using bidirectional JSON-RPC over a single WebSocket connection, a JSONRPC.Client subclass instance is available.
    // It is an instance of the class specified in the constructor of this EndpointBase subclass, `classReverseCallsClient`.
    // Also, it is attached to the same WebSocket connection of the current request.
    await incomingRequest.reverseCallsClient.rpc("methodOnTheOtherSide", ["paramValue", true, false]);

    return strReturn;
  }

  async divide(incomingRequest, nLeft, nRight)
  {
    return nLeft / nRight;
  }
};

const jsonrpcServer = new JSONRPC.Server();
jsonrpcServer.registerEndpoint(new TestEndpoint()); // See "Define an endpoint" section above.

// By default, JSONRPC.Server rejects all requests as not authenticated and not authorized.
jsonrpcServer.addPlugin(new JSONRPC.Plugins.Server.AuthenticationSkip());
jsonrpcServer.addPlugin(new JSONRPC.Plugins.Server.AuthorizeAll());

const wsJSONRPCRouter = new JSONRPC.BidirectionalWebsocketRouter(jsonrpcServer);

// Optional.
wsJSONRPCRouter.on("madeReverseCallsClient", (clientReverseCalls) => { /*add plugins or just setup the client even further*/ });

// Alternatively reuse existing web server: 
// const webSocketServer = new WebSocketServer({server: httpServerInstance});
const webSocketServer = new WebSocketServer({port: 18080});
webSocketServer.on("error", (error) => {console.error(error); process.exit(1);});

webSocketServer.on(
  "connection", 
  async (webSocket, upgradeRequest) => 
  {
    const nWebSocketConnectionID = wsJSONRPCRouter.addWebSocketSync(webSocket, upgradeRequest);
    // Do something with nWebSocketConnectionID and webSocket here, like register them as a pair with an authorization plugin.

    // const clientForThisConnection = wsJSONRPCRouter.connectionIDToSingletonClient(nWebSocketConnectionID, JSONRPC.Client);
  }
);
