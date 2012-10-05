package name.matik.genrestimeline;

import java.io.IOException;
import java.io.OutputStreamWriter;
import java.nio.charset.Charset;

import javax.servlet.ServletException;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

import org.json.simple.JSONObject;

import voldemort.client.ClientConfig;
import voldemort.client.SocketStoreClientFactory;
import voldemort.client.StoreClient;
import voldemort.client.StoreClientFactory;
import voldemort.versioning.Versioned;

public class GetArtistTagsServlet extends HttpServlet {

	private static final long serialVersionUID = 1L;
	
	private StoreClient<String, ArtistGenreInfo> client;

	@Override
	public void init() throws ServletException {
		super.init();

		String bootstrapUrl = "tcp://localhost:6666";
		StoreClientFactory factory = new SocketStoreClientFactory(new ClientConfig().setBootstrapUrls(bootstrapUrl));
		client = factory.getStoreClient("test");
	}

	@SuppressWarnings("unchecked")
	@Override
	protected void doPost(HttpServletRequest request, HttpServletResponse response) throws ServletException, IOException {
		OutputStreamWriter writer = new OutputStreamWriter(response.getOutputStream(), Charset.forName("UTF-8"));
		JSONObject result = new JSONObject();
		for (String artistName : request.getParameterMap().keySet()) {
			Versioned<ArtistGenreInfo> versioned = client.get(artistName);
			if (versioned != null && versioned.getValue() != null) {
				ArtistGenreInfo artistGenres = versioned.getValue();
				JSONObject artistGenresJson = new JSONObject();
				if (artistGenres.isBroken()) {
					artistGenresJson.put("broken", true);
				} else {
					for (String genre : artistGenres.getGenres().keySet()) {
						artistGenresJson.put(genre, artistGenres.getGenres().get(genre));
					}
				}
				result.put(artistName, artistGenresJson);
			}
		}
		writer.append(result.toJSONString());
		writer.flush();
	}

}
