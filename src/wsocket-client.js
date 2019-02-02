
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


class TestClient extends JSONRPC.Client
{
  /**
   * @param {JSONRPC.IncomingRequest} incomingRequest
   * @param {string} strReturn
   * @param {boolean} bThrow
   * 
   * @returns {string}
   */
  async ping(strReturn, bThrow)
  {
    return this.rpc("ping", [...arguments]);
  }


  /**
   * JSONRPC 2.0 notification. 
   * The server may keep processing "after" this function returns, as the server will never send a response.
   * 
   * @param {JSONRPC.IncomingRequest} incomingRequest
   * 
   * @returns null
   */
  async pingFireAndForget()
  {
    return this.rpc("ping", [...arguments], /*bNotification*/ true);
  }


  /**
   * @param {number} nLeft
   * @param {number} nRight
   *
   * @returns {number}
   */
  async divide(nLeft, nRight)
  {
    return this.rpc("divide", [...arguments]);
  }
}

async function testclient() {


  const jsonrpcServer = new JSONRPC.Server();
  jsonrpcServer.registerEndpoint(new TestEndpoint()); // See "Define an endpoint" section above.

  // By default, JSONRPC.Server rejects all requests as not authenticated and not authorized.
  jsonrpcServer.addPlugin(new JSONRPC.Plugins.Server.AuthenticationSkip());
  jsonrpcServer.addPlugin(new JSONRPC.Plugins.Server.AuthorizeAll());


  const webSocket = new WebSocket("ws://localhost:18080/api");
  await new Promise((fnResolve, fnReject) => {
    webSocket.addEventListener("open", fnResolve);
    webSocket.addEventListener("error", fnReject);
  });

  const wsJSONRPCRouter = new JSONRPC.BidirectionalWebsocketRouter(jsonrpcServer);


  const nWebSocketConnectionID = wsJSONRPCRouter.addWebSocketSync(webSocket);


  // Obtain single client. See above section "Extending the client" for the TestClient class (subclass of JSONRPC.Client).
  const theOnlyClient = wsJSONRPCRouter.connectionIDToSingletonClient(nWebSocketConnectionID, TestClient);

  let resp = await theOnlyClient.divide(3, 2);
  console.log('resp', resp)

}

testclient()


