import SwaggerUI from "swagger-ui-react";
import "swagger-ui-react/swagger-ui.css";

function ApiDocs() {
  return (
    <div>
      <SwaggerUI url="http://127.0.0.1:8000/api/schema/" />
    </div>
  );
}

export default ApiDocs;